import {ActionDict, grammars, Node} from "ohm-js";
import {Condition, Field, GenericCondition, Rete} from "./index";
import {production0GrammarContents} from "./productions0-ohm";


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
    const lhs = condsNode.toSpecs();
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
  MatchCondition(lParen: Node, matchSpec1: Node, matchSpec2: Node, matchSpec3: Node, rParen: Node, optFrom: Node, optLBrace: Node, conds: Node, optRBrace: Node) {
    const match1 = matchSpec1.toSpecs();
    const match2 = matchSpec2.toSpecs();
    const match3 = matchSpec3.toSpecs();
    return new Condition(match1, match2, match3); //todo or create AggregateCondition or ConditionArithTest to be appended to previous Condition
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

