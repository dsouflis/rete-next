import {ActionDict, grammars, Node} from "ohm-js";
import {
  AggregateComputation,
  AggregateCondition,
  AggregateCount,
  AggregateSum,
  ArithOp,
  CompOp,
  Condition,
  ConditionArithBinaryOp,
  ConditionArithConst,
  ConditionArithTest,
  ConditionArithVar,
  Field,
  FieldType,
  GenericCondition,
  getLocationsOfVariablesInConditions,
  isCompOp,
  NegativeCondition,
  PositiveCondition,
} from "./index";
import {production0GrammarContents} from "./productions0-ohm";
import {strict} from "assert";

const g = grammars(production0GrammarContents).Productions0;
const semantics = g.createSemantics();

function createAggregateComputation(name: string, expr: ConditionArithVar | null): AggregateComputation<any> | null { //todo handle general expressions
  switch(name.toUpperCase()) {
    case '#SUM': {
      strict.strict(expr, '#SUM needs an expression');
      return new AggregateSum(expr.v);
    }
    case '#COUNT': return new AggregateCount();
  }
  return null;
}

let cypherAnonymousVarCounter = 0;

function condsSpecsToConditions(condsSpecs: any): GenericCondition[] {
  const lhs: GenericCondition[] = [];
  for (const condsSpec of condsSpecs) {
    if (condsSpec instanceof Condition || condsSpec instanceof NegativeCondition || condsSpec instanceof PositiveCondition) {
      lhs.push(condsSpec as Condition);
    } else if (condsSpec instanceof MultipleConditions) {
      for (const cond of condsSpec.conds) {
        lhs.push(cond);
      }
    } else if (condsSpec instanceof ConditionArithTest) {
      strict.strict(lhs.length > 0, "Cannot start a condition list with a constraint");
      strict.strict(lhs[lhs.length - 1] instanceof Condition, "Cannot start a condition list with a constraint");
      const variables = condsSpec.variables();
      const variablesInConditions = getLocationsOfVariablesInConditions(variables, lhs);
      const earliestCondition = Object.values(variablesInConditions).reduce((x,y) => Math.min(x, y[0]), 999);
      if (earliestCondition === lhs.length - 1) {
        (lhs[lhs.length - 1] as Condition).intraArithTests.push(condsSpec);
      } else {
        (lhs[lhs.length - 1] as Condition).extraArithTests.push(condsSpec);
      }
    }
  }
  return lhs;
}

function checkConditionsStandingInForFacts(conds: GenericCondition[]) {
  for (const condsSpec of conds) {
    strict.strict(
      !(condsSpec instanceof NegativeCondition) && !(condsSpec instanceof PositiveCondition) && !(condsSpec instanceof AggregateCondition),
      'Negative/Positive/Aggregate grammar not allowed for assertions'
    );
    if (condsSpec instanceof MultipleConditions) {
      checkConditionsStandingInForFacts(condsSpec.conds);
    } else if(condsSpec instanceof Condition) {
      strict.strict(
      !condsSpec.intraArithTests.length && !condsSpec.extraArithTests.length,
        'Tests not allowed for assertions'
      );
    }
  }
}

function newCypherVar() {
  return `_${cypherAnonymousVarCounter++}`;
}

function createCondSpecsFromCypherSpecs(nodeSpecs: CypherNode, relsSpecs: CypherRelationship[]) {
  let currentLeft: CypherNode | null = nodeSpecs;
  let remaining = [...relsSpecs];
  const condSpecs: any[] = [];
  do {
    const {variable, labels, properties, where} = currentLeft;
    let firstEntityVariable = variable || newCypherVar();
    if(labels) {
      for (const label of labels) {
        condSpecs.push(new Condition(Field.var(firstEntityVariable), Field.constant('is-a'), Field.constant(label)));
      }
    }
    if(properties) {
      for (const propertyElem of properties) {
        const { property, value} = propertyElem;
        condSpecs.push(new Condition(Field.var(firstEntityVariable), Field.constant(property), value));
      }
    }
    if(where?.length) {
      for (const nodePropertyComp of where) {
        const { property, comp, value} = nodePropertyComp;
        if(property.variable !== firstEntityVariable) {
          throw new Error(`Only properties of the node are permitted in node-level WHERE`);
        }
        const valueVar = newCypherVar();
        const condition = new Condition(Field.var(firstEntityVariable), Field.constant(property.property), Field.var(valueVar));
        condSpecs.push(condition);
        const conditionArithTest = new ConditionArithTest(new ConditionArithVar(valueVar), comp, fieldToArith(value));
        condition.intraArithTests.push(conditionArithTest);
      }
    }
    if (remaining.length) {
      const [{node: currentRight, pattern}, ...newRemaining] = remaining;
      const {direction, filler} = pattern;
      if(!currentRight.variable) {
        currentRight.variable = `_${cypherAnonymousVarCounter++}`;
      }
      let relationName: string | null = null;
      let relationVar: string | null = null;
      let relationProperties: PropertyKeyValuePair[] | undefined = undefined;
      let relationWhere: NodePropertyComp[] | undefined = undefined;
      if(filler) {
        const {variable, labels, properties, where} = filler;
        if(variable) {
          relationVar = variable;
        } else if(properties?.length || where?.length) {
          relationVar = newCypherVar();
        }
        if(labels) {
          if(labels.length > 1)  throw new Error('Currently only relations that map directly to knowledge triples are supported');
          if(labels.length) {
            relationName = labels[0];
          }
        }
        relationProperties = properties;
        relationWhere = where;
      }
      let relationField: Field;
      if(!relationName) {
        relationField = Field.var(newCypherVar());
      } else {
        relationField = Field.constant(relationName);
      }
      let condition: Condition;
      if(direction === "right") {
        condition = new Condition(Field.var(firstEntityVariable), relationField, Field.var(currentRight.variable));
      } else {
        condition = new Condition(Field.var(currentRight.variable), relationField, Field.var(firstEntityVariable));
      }
      condSpecs.push(condition);
      if(relationVar) {
        condition.wholeWmeVar = relationVar;
        if(relationProperties) {
          for (const propertyElem of relationProperties) {
            const { property, value} = propertyElem;
            condSpecs.push(new Condition(Field.var(relationVar), Field.constant(property), value));
          }
        }
        if(relationWhere?.length) {
          for (const nodePropertyComp of relationWhere) {
            const { property, comp, value} = nodePropertyComp;
            if(property.variable !== relationVar) {
              throw new Error(`Only properties of the relation are permitted in relation-level WHERE`);
            }
            const valueVar = newCypherVar();
            const condition = new Condition(Field.var(relationVar), Field.constant(property.property), Field.var(valueVar));
            condSpecs.push(condition);
            const conditionArithTest = new ConditionArithTest(new ConditionArithVar(valueVar), comp, fieldToArith(value));
            condition.intraArithTests.push(conditionArithTest);
          }
        }

      }

      currentLeft = currentRight;
      remaining = newRemaining;
    } else {
      currentLeft = null;
    }
  } while(currentLeft);
  return new MultipleConditions(condSpecs);
}

semantics.addOperation<ProductionSpec[]>('toSpecs', {
  //Productions = ProductionItem+
  Productions(specs: Node): ProductionSpec[] {
    const toSpecs = specs.toSpecs();
    return toSpecs;
  },

  //ProductionItem = Production | Query | CypherQuery | CypherCreate
  ProductionItem(altNode: Node) {
    const toSpecs = altNode.toSpecs();
    return toSpecs;
  },

  // Query = "(" Condition+ "->" (varSpecifier ("," varSpecifier)+ )? ")"
  Query(lParen: Node, condsNode: Node, arrow: Node, varOpt: Node, commasOpt: Node, varsOpt: Node, rParen: Node) {
    const condsSpecs = condsNode.toSpecs();
    const lhs = condsSpecsToConditions(condsSpecs);
    const varSpec = varOpt.toSpecs()?.[0];
    const varSpecs = varsOpt.toSpecs()?.[0];
    let fields: Field[] = [];
    if(varSpec) {
      fields.push(varSpec);
    }
    if(varSpecs) {
      fields = [...fields, ...varSpecs];
    }
    const variables = fields.map(f => f.v);
    return {
      lhs,
      variables,
    } as ProductionSpec;
  },

  // CypherQuery = "match" PlainCypherCondition "return" ReturnVariable ("," ReturnVariable)*
  CypherQuery(matchNode: Node, condNode: Node, returnNode: Node, varNode: Node, commasOpt: Node, varsOpt: Node) {
    const condsSpecs = condNode.toSpecs();
    const lhs = condsSpecsToConditions([condsSpecs]);
    const varSpec = varNode.toSpecs();
    const varSpecs = varsOpt.toSpecs();
    const variables = [varSpec, ...varSpecs];
    for (let i = 0; i < variables.length; i++){
      const variable = variables[i];
      if(typeof variable === 'object') {
        const qualifiedProperty = variable as QualifiedProperty;
        const foundCondition: Condition | null = lhs
          .filter(c => (c instanceof Condition))
          .find((c: Condition) => c.attrs[0].type === FieldType.Var &&
            c.attrs[0].v === qualifiedProperty.variable &&
            c.attrs[1].type === FieldType.Const &&
            c.attrs[1].v === qualifiedProperty.property &&
            c.attrs[2].type === FieldType.Var
      ) as Condition | null;
        if(foundCondition) {
          variables[i] = foundCondition.attrs[2].v;
        } else {
          const newVar = newCypherVar();
          const condition = new Condition(
            Field.var(qualifiedProperty.variable),
            Field.constant(qualifiedProperty.property),
            Field.var(newVar),
          );
          lhs.push(condition);
          variables[i] = newVar;
        }
      }
    }
    return {
      lhs,
      variables,
    } as ProductionSpec;
  },

  //CypherCreate = create PlainCypherCondition MoreConditions
  CypherCreate(createNode: Node, condNode: Node, moreNode: Node) {
    const condSpecs: MultipleConditions = condNode.toSpecs();
    const moreSpecs: MultipleConditions[] = moreNode.toSpecs();
    const combined = moreSpecs.reduce(MultipleConditions.concatWith, condSpecs);
    const lhs = condsSpecsToConditions([combined]);
    checkConditionsStandingInForFacts(lhs);
    return {
      lhs,
    } as ProductionSpec;
  },

  //Assert = "(" "!" Condition+ ")"
  Assert(lparenNode: Node, bangNode: Node, condNode: Node, rparenNode: Node) {
    const condSpecs: Condition[] = condNode.toSpecs();
    const lhs = condsSpecsToConditions(condSpecs);
    checkConditionsStandingInForFacts(lhs);
    return {
      lhs,
    } as ProductionSpec;
  },

  //MoreConditions = ("," PlainCypherCondition)*
  MoreConditions(commas: Node, condsNode: Node) {
    const condsSpecs = condsNode.toSpecs();
    return condsSpecs;
  },

  //ReturnVariable =  QualifiedProperty | cypherVariable
  ReturnVariable(altNode: Node) {
    const altSpecs = altNode.toSpecs();
    return altSpecs;
  },

  //Production = "(" Condition+ "->" prodName (Assert | CypherCreate)? ")"
  Production(lParen: Node, condsNode: Node, arrow: Node, prodName: Node, optAssertNode: Node, rParen: Node): ProductionSpec {
    const condsSpecs = condsNode.toSpecs();
    const optAssert = optAssertNode.toSpecs().flatMap((x:any) => x);
    const lhs = condsSpecsToConditions(condsSpecs);
    const rhsAssert = optAssert.length ? condsSpecsToConditions(optAssert[0].lhs) : undefined;
    const rhs = prodName.toSpecs();
    return {
      lhs,
      rhs,
      rhsAssert,
    };
  },

  //Condition = MatchCondition | CypherCondition | NotCondition | AggregateCondition
  Condition(alt: Node) {
    const cond = alt.toSpecs();
    return cond;
  },

  //PlainCypherCondition = CypherNode CypherRelationship*
  PlainCypherCondition(cnode: Node, crels: Node) {
    const nodeSpecs = cnode.toSpecs();
    const relsSpecs = crels.toSpecs();
    return createCondSpecsFromCypherSpecs(nodeSpecs, relsSpecs);
  },

  //CypherCondition = "cypher" "{" CypherNode CypherRelationship* "}"
  CypherCondition(cypher: Node, lBrace: Node, cnode: Node, crels: Node, rBrace: Node) {
      const nodeSpecs = cnode.toSpecs();
      const relsSpecs = crels.toSpecs();
      return createCondSpecsFromCypherSpecs(nodeSpecs, relsSpecs);
  },

  //CypherNode = "(" cypherVariable? LabelExpression? PropertyKeyValueExpression? PropertyWhereExpression? ")"
  CypherNode(lParen: Node, variableOpt: Node, labelsOpt: Node, propertiesOpt: Node, whereOpt: Node, rParen: Node) {
    const varSpecs = variableOpt?.toSpecs();
    const labelSpecs = labelsOpt?.toSpecs()?.flatMap((x:any) => x);
    const propertiesSpecs = propertiesOpt.toSpecs();
    const whereSpecs = whereOpt.toSpecs();
    return {
      variable: varSpecs?.join(''),
      labels: labelSpecs,
      properties: propertiesSpecs?.[0],
      where: whereSpecs?.[0],
    } as CypherNode;
  },

  //PropertyWhereExpression = "where" NodePropertyComparisonList
  PropertyWhereExpression(whereNode: Node, comps: Node) {
    const toSpecs = comps.toSpecs();
    return toSpecs;
  },

  // NodePropertyComparisonList = NodePropertyComparison ("and" NodePropertyComparisonList)*
  NodePropertyComparisonList(compNode: Node, ands: Node, compsNode: Node) {
    const compSpecs = compNode.toSpecs();
    const compsSpecs = compsNode.toSpecs();
    return [compSpecs, ...compsSpecs];
  },

  // NodePropertyComparison = QualifiedProperty comp constSpecifier
  NodePropertyComparison(propNode: Node, compNode: Node, constNode: Node) {
    const property = propNode.toSpecs();
    const comp = compNode.toSpecs()[0];
    const value = constNode.toSpecs();
    return {
      property,
      comp,
      value,
    } as NodePropertyComp;
  },

  // QualifiedProperty = cypherVariable "." cypherVariable
  QualifiedProperty(varNode: Node, dot: Node, propNode: Node) {
    const variable = varNode.toSpecs();
    const property = propNode.toSpecs();
    return {
      variable,
      property,
    } as QualifiedProperty;
  },

  //cypherVariable = alnum+
  cypherVariable(alt: Node) {
    if (alt) {
      const toSpecs = alt.toSpecs();
      return toSpecs.join('');
    }
    return null;
  },

  //PropertyKeyValueExpression = "{" PropertyKeyValuePair PropertyKeyValuePairList* "}"
  PropertyKeyValueExpression(lBrace: Node, propKV: Node, propKVs: Node, rBrace: Node) {
    const propSpecs = propKV.toSpecs();
    const propsSpecs = propKVs.toSpecs();
    if(propsSpecs.length) {
      return [propSpecs, ...propsSpecs[0]]
    }
    return [propSpecs];
  },

  //PropertyKeyValuePairList =  ("," PropertyKeyValuePair)+
  PropertyKeyValuePairList(rep: Node, b: Node) {
    const toSpecs = b.toSpecs();
    return toSpecs;
  },

  //PropertyKeyValuePair = cypherVariable ":" constSpecifier
  PropertyKeyValuePair(varNode: Node, colon: Node, constNode: Node) {
    const property = varNode.toSpecs();
    const value = constNode.toSpecs();
    return {
      property,
      value,
    } as PropertyKeyValuePair;
  },

  //LabelExpression = ":" LabelTerm
  LabelExpression(colon: Node, term: Node) {
    const toSpecs = term.toSpecs();
    return toSpecs;
  },

  //LabelTerm = labelIdentifier LabelModifiers?
  LabelTerm(ident: Node, modifiersOpt: Node) {
    const identToSpecs = ident.toSpecs();
    const modifiersSpecs = modifiersOpt?.toSpecs()?.flatMap((x:any) => x);
    if (modifiersSpecs?.length) {
      return [identToSpecs, ...modifiersSpecs];
    } else {
      return [identToSpecs];
    }
  },

  // LabelModifiers = LabelConjunction
  LabelModifiers(conj: Node) {
    return conj.toSpecs();
  },

  //LabelConjunction = "&" LabelTerm
  LabelConjunction(amp: Node, term: Node) {
    return term.toSpecs();
  },

  //labelIdentifier = (alnum | "_")+
  labelIdentifier(many: Node) {
    const toSpecs = many.toSpecs();
    return toSpecs.join('');
  },

  //CypherRelationship = RelationshipPattern CypherNode
  CypherRelationship(pat: Node, cnode: Node) {
    const patSpecs = pat.toSpecs();
    const nodeSpecs = cnode.toSpecs();
    return {
      pattern: patSpecs,
      node: nodeSpecs,
    } as CypherRelationship;
  },

  //RelationshipPattern = FullPattern | abbreviatedRelationship
  RelationshipPattern(alt: Node) {
    const toSpecs = alt.toSpecs();
    return toSpecs;
  },

  //FullPattern =
  //    "<-[" PatternFiller "]-"
  //  | "-[" PatternFiller "]->"
  FullPattern(leftArrowPart: Node, filler: Node, rightArrowPart: Node) {
    const arrowSpecs = leftArrowPart.toSpecs();
    const fillerSpecs = filler.toSpecs();
    return {
      direction: arrowSpecs === '<-' ? 'left' : 'right',
      filler: fillerSpecs,
    } as CypherRelPattern;
  },

  //PatternFiller =  cypherVariable? LabelExpression? PropertyKeyValueExpression? PropertyWhereExpression?
  PatternFiller(variableOpt: Node, labelsOpt: Node, propertiesOpt: Node, whereOpt: Node) {
    const varSpecs = variableOpt?.toSpecs();
    const labelSpecs = labelsOpt?.toSpecs()?.flatMap((x:any) => x);
    const propertiesSpecs = propertiesOpt.toSpecs();
    const whereSpecs = whereOpt.toSpecs();
    return {
      variable: varSpecs?.join(''),
      labels: labelSpecs,
      properties: propertiesSpecs?.[0],
      where: whereSpecs?.[0],
    } as CypherNode;
  },

  //abbreviatedRelationship = "<--" | "-->"
  abbreviatedRelationship(arrowAlt: Node) {
    const toSpecs = arrowAlt.toSpecs();
    return {
      direction: toSpecs === '<--' ? 'left' : 'right',
    } as CypherRelPattern;
  },

  //MatchCondition = "(" MatchSpecifier MatchSpecifier MatchSpecifier ")" ("as" varSpecifier)?
  MatchCondition(lParen: Node, matchSpec1: Node, matchSpec2: Node, matchSpec3: Node, rParen: Node, asOpt: Node, wholeVarNode: Node) {
    const wholeVar = wholeVarNode.toSpecs();
    let match1 = matchSpec1.toSpecs();
    const match2 = matchSpec2.toSpecs();
    let match3 = matchSpec3.toSpecs();
    if(match2 instanceof Field && (match2 as Field).type === FieldType.Const && isCompOp((match2 as Field).v)) {
      if (match1 instanceof Field) {
        match1 = fieldToArith(match1);
      }
      if (match3 instanceof Field) {
        match3 = fieldToArith(match3);
      }
      return new ConditionArithTest(match1, (match2 as Field).v as CompOp, match3);
    }
    const condition = new Condition(match1, match2, match3);
    if(wholeVar?.length) {
      condition.wholeWmeVar = wholeVar[0].v;
    }
    return condition;
  },

  //AggregateCondition = "(" varSpecifier "<-" AggrSpecifier ")" "from"  "{" Condition+ "}"
  AggregateCondition(lParen: Node, varSpec: Node, assgn: Node, aggrSpec: Node, rParen: Node, from: Node, rBrace: Node, condsNode: Node, lBrace: Node) {
    const variable = varSpec.toSpecs() as Field;
    const {name, expr} = aggrSpec.toSpecs();
    const condsSpecs = condsNode.toSpecs();
    const conds = condsSpecsToConditions(condsSpecs);
    const aggregateComputation = createAggregateComputation(name, expr);
    strict.strict(aggregateComputation, `Aggregate ${name} does not exist`);
    return new AggregateCondition(variable.v, aggregateComputation!!, conds);
  },

  //MatchSpecifier = varSpecifier | constSpecifier | Expr
  MatchSpecifier(alt: Node) {
    return alt.toSpecs();
  },

  //varSpecifier = "<" alnum+ ">"
  varSpecifier(left: Node, varNameNode: Node, right: Node) {
    const toSpecs = varNameNode.toSpecs();
    return Field.var(toSpecs.join(''));
  },

  //constSpecifier = (alnum | "-")+ | quotedConst | comp
  constSpecifier(alt: Node) {
    const toSpecs = alt.toSpecs();
    return Field.constant(toSpecs.join(''));
  },

  //quotedConst = "'\" (alnum|space)+ "\""
  quotedConst(quote: Node, str: Node, quote2: Node) {
    const toSpecs = str.toSpecs();
    return toSpecs;
  },

  //AggrSpecifier =  "#" (alnum)+ "(" MatchOrOp? ")"
  AggrSpecifier(hash: Node, lettersNode: Node, lParen: Node, exprNodeOpt: Node, rParen: Node) {
    const letters = lettersNode.toSpecs();
    const n = letters.join('');
    const expr = exprNodeOpt?.toSpecs();
    return { name: '#' +n, expr: expr?.[0]};
  },

  //Expr = "(" MathExpr op MathExpr ")"
  Expr(lParen: Node, expr1Node: Node, opNode: Node, expr2Node: Node, rParen: Node) {
    const expr1 = expr1Node.toSpecs();
    const expr2 = expr2Node.toSpecs();
    const op = opNode.toSpecs()[0];
    return new ConditionArithBinaryOp(expr1, op as ArithOp, expr2);
  },

  // MathExpr = MatchSpecifier
  MathExpr(matchSpecNode: Node) {
    const matchSpec = matchSpecNode.toSpecs();
    if(matchSpec instanceof Field) {
      return fieldToArith(matchSpec);
    }
    return matchSpec;
  },

  //MatchOrOp =  OpExpr | varSpecifier | constSpecifier
  MatchOrOp(alt: Node) {
    return alt.toSpecs();
  },

  //OpExpr = MathExpr op MathExpr
  OpExpr(expr1Node: Node, opNode: Node, expr2Node: Node) {
    const expr1 = expr1Node.toSpecs();
    const expr2 = expr2Node.toSpecs();
    const op = opNode.toSpecs()[0];
    return new ConditionArithBinaryOp(expr1, op as ArithOp, expr2);
  },

  //NotCondition = "-" "{" Condition+ "}"
  NotCondition(notNode: Node, lBrace: Node, condsNode: Node, rBrace: Node) {
    const conds = condsNode.toSpecs();
    return new NegativeCondition(conds);
  },

  //YesCondition = "+" "{" Condition+ "}"
  YesCondition(yesNode: Node, lBrace: Node, condsNode: Node, rBrace: Node) {
    const conds = condsNode.toSpecs();
    return new PositiveCondition(conds);
  },

  //prodName = quotedConst
  prodName(quotedNode: Node): string {
    const letters = quotedNode.toSpecs();
    const n = letters.join('');
    return n;
  },

  alnum(an: Node) {
    const toSpecs: string | string[] = an.toSpecs();
    return typeof toSpecs === 'string' ? toSpecs : toSpecs.flatMap(x => x.toString()).join();
  },

  letter(l: Node) {
    return l.toSpecs();
  },

  digit(l: Node) {
    return l.toSpecs();
  },

  _iter(...children: any) {
    return children.map((x: any) => x.toSpecs());
  },
  _nonterminal(...children: any) {
    return children.map((x: any) => x.toSpecs());
  },
  _terminal() {
    return (this as any).sourceString;
  },
} as unknown as ActionDict<ProductionSpec[]>);

export interface CypherNode {
  variable?: string,
  labels?: string[],
  properties?: PropertyKeyValuePair[],
  where?: NodePropertyComp[],
}

export interface CypherRelPattern {
  direction: 'left' | 'right',
  filler?: CypherNode,
}

export interface CypherRelationship {
  pattern: CypherRelPattern,
  node: CypherNode,
}

export class MultipleConditions {
  conds: GenericCondition[];

  constructor(conds: GenericCondition[]) {
    this.conds = conds;
  }

  static concatWith(one: MultipleConditions, other: MultipleConditions): MultipleConditions {
    return new MultipleConditions([...one.conds, ...other.conds]);
  }
}

interface PropertyKeyValuePair {
  property: string,
  value: Field,
}
interface QualifiedProperty {
  variable: string,
  property: string,
}

interface NodePropertyComp {
  property: QualifiedProperty,
  comp: CompOp,
  value: Field,

}

// lhs & variables => Query, CypherQuery
// lhs & rhs => Production
// lhs => CypherCreate
export interface ProductionSpec {
  lhs: GenericCondition[],
  rhsAssert?: GenericCondition[],
  rhs?: string,
  variables?: string[],
}

export interface ParseError {
  error: string | undefined;
}

export interface ParseSuccess {
  specs: ProductionSpec[];
}

export function parseRete(input: string): ParseError | ParseSuccess {
  try {
    let matchResult = g.match(input);

    if (matchResult.failed()) {
      return ({
        error: matchResult.message
      });
    } else {
      let dict = semantics(matchResult);
      const specs = dict['toSpecs'].apply(dict) as ProductionSpec[]; // const specs = dict.toSpecs();
      return ({
        specs,
      });
    }
  } catch (e: any) {
    return ({
      error: e.message
    });
  }
}

function fieldToArith(matchSpec: Field) {
  if(matchSpec.type === FieldType.Const) {
    const number = parseFloat(matchSpec.v);
    strict.strict(!Number.isNaN(number), `Not a number ${matchSpec.v}`);
    return new ConditionArithConst(number)
  } else {
    return new ConditionArithVar(matchSpec.v);
  }

}

