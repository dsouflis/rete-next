import {ActionDict, grammars, Node} from "ohm-js";
import {
  ArithOp,
  CompOp,
  Condition, ConditionArithBinaryOp,
  ConditionArithConst,
  ConditionArithTest, ConditionArithVar,
  Field,
  FieldType,
  GenericCondition,
  isCompOp,
  NegativeCondition,
} from "./index";
import {production0GrammarContents} from "./productions0-ohm";
import {strict} from "node:assert";


const g = grammars(production0GrammarContents).Productions0;
const semantics = g.createSemantics();

semantics.addOperation<ProductionSpec[]>('toSpecs', {
  //Productions = Production+
  Productions(specs: Node): ProductionSpec[] {
    const toSpecs = specs.toSpecs();
    return toSpecs;
  },

  //Production = "(" Condition+ "->" prodName ")"
  Production(lParen: Node, condsNode: Node, arrow: Node, prodName: Node, rParen: Node): ProductionSpec {
    const condsSpecs = condsNode.toSpecs();
    const lhs: GenericCondition[] = [];
    for (const condsSpec of condsSpecs) {
      if(condsSpec instanceof Condition || condsSpecs instanceof NegativeCondition) {
        lhs.push(condsSpec as Condition);
      } else if(condsSpec instanceof ConditionArithTest) {
        strict.strict(lhs.length > 0, "Cannot start a condition list with a constraint");
        strict.strict(lhs[lhs.length - 1] instanceof Condition, "Cannot start a condition list with a constraint");
        //todo find if test is internal or external
        (lhs[lhs.length - 1] as Condition).intraArithTests.push(condsSpec);
      }
    }
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

  //MatchCondition = "(" MatchSpecifier MatchSpecifier MatchSpecifier ")" ("from"  "{" Condition+ "}")?
  MatchCondition(lParen: Node, matchSpec1: Node, matchSpec2: Node, matchSpec3: Node, rParen: Node, optFrom: Node, optLBrace: Node, optConds: Node, optRBrace: Node) {
    const match1 = matchSpec1.toSpecs();
    const match2 = matchSpec2.toSpecs();
    const match3 = matchSpec3.toSpecs();
    const conds = optConds.toSpecs();
    if(match2 instanceof Field && (match2 as Field).type === FieldType.Const && isCompOp((match2 as Field).v)) {
      //todo create ConditionArithTest to be appended to previous Condition
    }
    return new Condition(match1, match2, match3); //todo or create AggregateCondition
  },

  //MatchSpecifier = varSpecifier | constSpecifier | AggrSpecifier | Expr
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

  //AggrSpecifier =  "#" (alnum)+ Expr
  AggrSpecifier(hash: Node, lettersNode: Node, exprNode: Node) {
    const letters = lettersNode.toSpecs();
    const n = letters.join('');
    const expr = exprNode.toSpecs(); //todo
    return '#' + n;
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
      if(matchSpec.type === FieldType.Const) {
        const number = parseFloat(matchSpec.v);
        strict.strict(!Number.isNaN(number), `Not a number ${matchSpec.v}`);
        return new ConditionArithConst(number)
      } else {
        return new ConditionArithVar(matchSpec.v);
      }
    }
    return matchSpec;
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

