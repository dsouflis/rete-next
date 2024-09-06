import {ActionDict, grammars, Node} from "ohm-js";
import {
  AggregateComputation,
  AggregateCondition, AggregateCount, AggregateSum,
  ArithOp,
  CompOp,
  Condition, ConditionArithBinaryOp,
  ConditionArithConst,
  ConditionArithTest, ConditionArithVar,
  Field,
  FieldType,
  GenericCondition, getLocationsOfVariablesInConditions,
  isCompOp,
  NegativeCondition,
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

function condsSpecsToConditions(condsSpecs) {
  const lhs: GenericCondition[] = [];
  for (const condsSpec of condsSpecs) {
    if (condsSpec instanceof Condition || condsSpec instanceof NegativeCondition) {
      lhs.push(condsSpec as Condition);
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

semantics.addOperation<ProductionSpec[]>('toSpecs', {
  //Productions = Production+
  Productions(specs: Node): ProductionSpec[] {
    const toSpecs = specs.toSpecs();
    return toSpecs;
  },

  //Production = "(" Condition+ "->" prodName ")"
  Production(lParen: Node, condsNode: Node, arrow: Node, prodName: Node, rParen: Node): ProductionSpec {
    const condsSpecs = condsNode.toSpecs();
    const lhs = condsSpecsToConditions(condsSpecs);
    const rhs = prodName.toSpecs();
    console.log(lhs, rhs);
    return {
      lhs,
      rhs,
    };
  },

  //Condition = MatchCondition | NotCondition
  Condition(alt: Node) {
    const cond = alt.toSpecs();
    return cond;
  },

  //MatchCondition = "(" MatchSpecifier MatchSpecifier MatchSpecifier ")"
  MatchCondition(lParen: Node, matchSpec1: Node, matchSpec2: Node, matchSpec3: Node, rParen: Node) {
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
    return new Condition(match1, match2, match3);
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

  //constSpecifier = (alnum | "-")+ | comp
  constSpecifier(alt: Node) {
    const toSpecs = alt.toSpecs();
    return Field.constant(toSpecs.join(''));
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

  //MatchOrOp =  OpExpr | varSpecifier | constSpecifier

  //NotCondition = "-" "{" Condition+ "}"
  NotCondition(notNode: Node, lBrace: Node, condsNode: Node, rBrace: Node) {
    const conds = condsNode.toSpecs();
    return new NegativeCondition(conds);
  },

  //prodName = "\"" (alnum|" ")+ "\""
  prodName(lQuote: Node, lettersNode: Node, rQuote: Node): string {
    const letters = lettersNode.toSpecs();
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

  _iter(...children) {
    return children.map(x => x.toSpecs());
  },
  _nonterminal(...children) {
    return children.map(x => x.toSpecs());
  },
  _terminal() {
    return this.sourceString;
  },
} as unknown as ActionDict<ProductionSpec[]>);

export interface ProductionSpec {
  lhs: GenericCondition[],
  rhs: string,
}

export interface ParseError {
  error: string | undefined;
}

export interface ParseSuccess {
  specs: ProductionSpec[];
}

export function parseRete(input: string): ParseError | ParseSuccess {
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

