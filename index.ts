import {strict} from 'assert';

let idCounter = 1;

class Identifiable {
  id: number = idCounter++;
}

enum WMEFieldType {
  Whole = -2,
  Ident = 0,
  Attr = 1,
  Val = 2,
  NumFields=3
}

function printFieldType(field: WMEFieldType) {
  switch (field) {
    case WMEFieldType.Ident: return "id";
    case WMEFieldType.Attr: return"attr";
    case WMEFieldType.Val: return "val";
    case WMEFieldType.NumFields: return "num-fields";
  }
  return '';
}

// pg 21
export class WME {
    fields: any[] = ['','',''];
    get_field(ty: WMEFieldType) : any {
      if(ty === WMEFieldType.Whole) return this;
        return this.fields[ty];
    }

    constructor(id: any, attr: any, val: any) {
        this.fields[WMEFieldType.Ident] = id;
        this.fields[WMEFieldType.Attr] = attr;
        this.fields[WMEFieldType.Val] = val;
    }

    toString() {
      let s = "(";
      for(let f = 0; f < WMEFieldType.NumFields; ++f) {
          s += this.fields[f].toString();
          if (f < WMEFieldType.NumFields - 1) s += " ";
      }
      s += ")";
      return s;
    }
}

export class FuzzyWME extends WME {
  μ: number;

  constructor(id: any, attr: any, val: any, μ: number) {
    super(id, attr, val);
    this.μ = μ;
  }

  toString(): string {
    return super.toString() + "[" + this.μ + "]";
  }
}

// pg 21
class AlphaMemory extends Identifiable{
  items: WME[] = []
  successors: JoinNode[] = [];
  parent: TestNode;

  constructor(parent: TestNode) {
    super();
    this.parent = parent;
  }

  toString() {
    let s: string = "(alpha-memory #" + this.id + ":" + this.items.length + " ";
    for (const wme of this.items) s += wme + " ";
    s += ")";
    return s;
  }
}

// pg 14
export abstract class TestNode { //ds: Exported to facilitate unit tests
  output_memory: AlphaMemory | null;
  children: TestNode[] = [];
  hashtable: {[f:number]:{[sym:string]:TestNode[]}} = {};
  parent: TestNode | null = null;

  constructor(
    output_memory: AlphaMemory | null
  ) {
    this.output_memory = (output_memory);
  }

  abstract testWme(w: WME) : boolean;

  wme_to_propagate(w: WME) {
    return w;
  }
}

export class DummyTestNode extends TestNode {
  constructor() {
    super(null);
  }

  toString() {
    return "(const-test dummy)";
  }

  testWme(w: WME): boolean {
    return true;
  }
}
export class NeverTestNode extends TestNode {
  constructor() {
    super(null);
  }

  toString() {
    return "(const-test never)";
  }

  testWme(w: WME): boolean {
    return false;
  }
}

export class ConstTestNode extends TestNode  {
  field_to_test: WMEFieldType;
  field_must_equal: string;

  constructor(
    field_to_test: WMEFieldType,
    field_must_equal: string,
    output_memory: AlphaMemory | null,
    parent: TestNode
  ) {
    super(output_memory);
    this.field_to_test = field_to_test;
    this.field_must_equal = field_must_equal;
    this.parent = parent;
  }

  toString() {
    return "(const-test " + printFieldType(this.field_to_test) + " =? " + this.field_must_equal + ")";
  }

  testWme(w: WME): boolean {
    return w.get_field(this.field_to_test) === this.field_must_equal;
  }
}

export class IntraTestNode extends TestNode {
  first_field: WMEFieldType;
  second_field: WMEFieldType;

  constructor(
    first_field: WMEFieldType,
    second_field: WMEFieldType,
    output_memory: AlphaMemory | null,
    parent: TestNode
    ) {
    super(output_memory);
    this.first_field = first_field;
    this.second_field = second_field;
    this.parent = parent;
  }

  testWme(w: WME): boolean {
    return w.fields[this.first_field] === w.fields[this.second_field];
  }

  toString() {
    return "(const-test " + printFieldType(this.first_field) + " == " + this.second_field + ")";
  }
}

export class FuzzyTestNode extends TestNode {
  fuzzyVariable: string;
  fuzzyValue: string;
  fuzzySystem: FuzzyVariable;

  constructor(fuzzySystem: FuzzyVariable, fuzzyVariable: string, fuzzyValue: string, output_memory: AlphaMemory | null, parent: TestNode) {
    super(output_memory);
    this.fuzzySystem = fuzzySystem;
    this.fuzzyVariable = fuzzyVariable;
    this.fuzzyValue = fuzzyValue;
  }

  testWme(w: WME): boolean {
    if(w.fields[WMEFieldType.Attr] !== this.fuzzyVariable) return false;
    if(Number.isNaN(parseFloat(w.fields[WMEFieldType.Val]))) return false;
    return true;
  }

  wme_to_propagate(w: WME): WME {
    const mu = (w instanceof FuzzyWME) ? w.μ : 1;
    const normalized = parseFloat(w.fields[WMEFieldType.Val]) * mu;
    const μ = this.fuzzySystem.computeMembershipValueForFuzzyValue(this.fuzzyValue, normalized);
    return new FuzzyWME(w.fields[WMEFieldType.Ident], this.fuzzyVariable, this.fuzzyValue, μ);
  }

  toString(): string {
    return "(fuzzy-test " + this.fuzzyVariable + " " + this.fuzzyValue + ")";
  }
}

export type ArithOp = '+' | '-' | '*' | '/';
export type CompOp = '=' | '<>' | '<' | '<=' | '>' | '>=';

export function isArithOp(op: string) {
  return ['+', '-', '*', '/'].includes(op);
}

export function isCompOp(op: string) {
  return ['=', '<>', '<', '<=', '>', '>='].includes(op);
}

export interface ArithExpression {
  eval(token: Token | null, w: WME): number;
}

export interface ArithSymbolicExpression {
  evalAsString(t: Token | null, w: WME): string;
}

export class VarExpression implements ArithExpression, ArithSymbolicExpression {
  ix_in_token: number | null;
  field: number;

  constructor(field: number, ix_in_token: number | null= null) {
    this.field = field;
    this.ix_in_token = ix_in_token;
  }

  eval(t: Token | null, w: WME): number {
    const s = this.evalAsString(t, w);
    return +s;
  }

  evalAsString(t: Token | null, w: WME) {
    strict.strict(this.ix_in_token === null || t !== null, 'Cannot evaluate variable')
    const w2 = this.ix_in_token === null ? w : t!.index(this.ix_in_token);
    const s = w2.fields[this.field];
    return s;
  }

  toString() {
    if(this.ix_in_token === null) {
      return "α[" + this.field + "]"
    }
    return "β" + this.ix_in_token + "[" + this.field + "]";
  }
}

export class ConstExpression implements ArithExpression {
  v: number;

  constructor(v: number) {
    this.v = v;
  }

  eval(t: Token | null, w: WME): number {
    return this.v;
  }

  toString() {
    return this.v.toString();
  }
}

export class ConstSymbolicExpression implements ArithExpression, ArithSymbolicExpression {
  v: string;

  constructor(v: string) {
    this.v = v;
  }

  eval(t: Token | null, w: WME): number {
    strict.strict( false, "Wrong use of const symbolic expression in arithmetic expression");
    return 0;
  }

  evalAsString(t: Token | null, w: WME): string {
    return this.v;
  }

  toString() {
    return this.v.toString();
  }
}

export class BinaryOpExpression implements ArithExpression {
  op: ArithOp;
  leftOperand: ArithExpression;
  rightOperand: ArithExpression;

  constructor(leftOperand: ArithExpression, op: ArithOp, rightOperand: ArithExpression) {
    this.op = op;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
  }

  eval(t: Token | null, w: WME): number {
    const leftValue = this.leftOperand.eval(t, w);
    const rightValue = this.rightOperand.eval(t, w);
    switch (this.op) {
      case "+": return leftValue + rightValue;
      case "-": return leftValue - rightValue;
      case "*": return leftValue * rightValue;
      case "/": return leftValue / rightValue;
    }
    return 0;
  }

  toString() {
    return "(" + this.leftOperand + " " + this.op + " " + this.rightOperand + ")";
  }

}

export interface AbstractTestAtJoinNode {
  test(t: Token | null, w: WME): boolean;
}

export class ArithTestNode extends TestNode implements AbstractTestAtJoinNode {
  comp: CompOp;
  leftOperand: ArithExpression;
  rightOperand: ArithExpression;

  constructor(output_memory: AlphaMemory | null, leftOperand: ArithExpression, comp: CompOp, rightOperand: ArithExpression) {
    super(output_memory);
    this.comp = comp;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
  }

  testWme(w: WME): boolean {
    return this.test(null, w);
  }

  test(t: Token | null, w: WME): boolean {
    if(
      (this.comp === '<>' || this.comp === '=') &&
      (this.leftOperand instanceof VarExpression || this.leftOperand instanceof ConstSymbolicExpression) &&
      (this.rightOperand instanceof VarExpression || this.rightOperand instanceof ConstSymbolicExpression)
    ) {
      const s1 = (this.leftOperand as unknown as ArithSymbolicExpression).evalAsString(t, w);
      const s2 = (this.rightOperand as unknown as ArithSymbolicExpression).evalAsString(t, w);
      if(Number.isNaN(parseFloat(s1)) && Number.isNaN(parseFloat(s2))) {
        switch (this.comp) {
          case "=": return s1 === s2;
          case "<>": return s1 !== s2;
        }
      }
    }

    const leftValue = this.leftOperand.eval(t, w);
    const rightValue = this.rightOperand.eval(t, w);
    switch (this.comp) {
      case "=": return Math.abs(leftValue - rightValue) < 1e-6;
      case "<>": return Math.abs(leftValue - rightValue) > 1e-6;
      case "<": return Math.abs(leftValue - rightValue) > 1e-6 && leftValue < rightValue;
      case ">": return Math.abs(leftValue - rightValue) > 1e-6 && leftValue > rightValue;
      case "<=": return Math.abs(leftValue - rightValue) < 1e-6 || leftValue < rightValue;
      case ">=": return Math.abs(leftValue - rightValue) < 1e-6 || leftValue > rightValue;
    }

  }

  toString(): string {
    return "(arith-test " + this.leftOperand + " " + this.comp + " " + this.rightOperand + ")";
  }
}

class TokenTest implements AbstractTestAtJoinNode {
  test(t: Token | null, w: WME): boolean {
    return (w.fields[2] instanceof Token) && t !== null && (w.fields[2] as Token).equalTo(t); //fails identity test! Why?
  }

  toString() {
    return '(token-test)';
  }
}

class ExistTest implements AbstractTestAtJoinNode {
  test(t: Token | null, w: WME): boolean {
    return w.fields[0] === '1';
  }

  toString() {
    return '(exist-test)';
  }
}

// pg 22
export class Token {
  parent: Token | null; // items [0..i-1]
  token_chain_ix: number;
  wme: WME; // item i

  //For NCC
  owner: Token | null = null;
  nccResults: Token[] | null = null;

  constructor(wme: WME, parent: Token | null) {
    this.wme = (wme);
    this.parent = (parent);
    if (!parent) {
      this.token_chain_ix = 0;
    } else {
      this.token_chain_ix = parent.token_chain_ix+1;
    }
  }

  // implicitly stated on pages:
  // - pg 20
  // - pg 25 {With list-form tokens,the following statement is really a loop}
  index(ix: number): WME {
    if (!((ix >= 0) && (ix <= this.token_chain_ix))) {
      console.error("ix: " + ix + " token_chain_ix: " + this.token_chain_ix + " wme: " + this.wme + "\n");
    }
    strict.strict(ix >= 0, "Index cannot be smaller than 0");
    strict.strict(ix <= this.token_chain_ix, "Index cannot be bigger than the token_chain_ix");
    if (ix == this.token_chain_ix) {
      return this.wme;
    }
    strict.strict(this.parent !== null, "Parent is null");
    return this.parent!.index(ix);
  }

  toString() {
    let s = "(";
    for(let p: Token | null = this; p !== null; p = p.parent) {
      strict.strict(p.wme, "WME must exist");
      s += (p.wme);
      if (p.parent !== null) { s += "->";}
    }
    if(this.nccResults?.length) {
      const join = this.nccResults?.map(t => t.toString()).join(', ');
      s += '| ncc: '+join+'';
    }
    s += ")";
    return s;
  }

  toArray(): WME[] {
    function toArrayAux(t: Token | null, acc: WME[]): WME[] {
      if(!t) return acc;
      return toArrayAux(t.parent, [t.wme, ...acc]);
    }
    return toArrayAux(this, []);
  }

  addToNccResults(t: Token) {
    if(this.nccResults === null) this.nccResults = [];
    this.nccResults.push(t);
    t.owner = this;
  }

  removeFromNccResults(t: Token | null, w: WME) {
    if (this.nccResults) {
      const found = this.nccResults.find(t1 => tokenIsParentAndWME(t1, t, w));
      this.nccResults = this.nccResults.filter(t1 => t1 !== found);
    }
  }

  equalTo(t2: Token): boolean {
    if(this.wme !== t2.wme) return false;
    if(this.token_chain_ix != t2.token_chain_ix) return false;
    if(this.token_chain_ix === 0) return true;
    return this.parent!.equalTo(t2.parent!);
  }
}

// pg 22
class BetaMemory extends Identifiable{
  parent: JoinNode; // invariant: must be valid.
  items: Token[] = [];
  children: JoinNode[] = [];

  constructor(parent: JoinNode) {
    super();
    this.parent = parent;
  }

  // pg 23: dodgy! the types are different from BetaMemory and their children
  // updates
  join_activation(t: Token | null, w: WME, add: boolean) {
    let fullToken: Token;
    if(Rete.debug) console.log('join_activation' + (add?"[add]":"[del]") + '| ' + this + ' on ' + t + ' and '+ w);
    if (add) {
      fullToken = new Token(w, t);
      this.items = [fullToken, ...this.items];
      for (let child of this.children) {
        child.beta_activation(fullToken, add);
      }
    } else {
      const fullToken = this.items.find(t1 => tokenIsParentAndWME(t1, t, w));
      if(!fullToken) {
        console.error(`beta-memory #${this.id}: Did not find token with WME=${w.toString()} and parent=${t?.toString()}`);
        return;
      }
      for (let child of this.children) {
        child.beta_activation(fullToken, add);
      }
      this.items = this.items.filter(t1 => t1 !== fullToken);
    }
  }

  toString() {
    let s  = "(beta-memory #" + this.id + " items: (";
    for(let item of this.items) {
      s += item + ' ';
    }
    s += ")| " + this.children.length + " children";
    s += ")";
    return s;
  }
}

// pg 24
class TestAtJoinNode implements AbstractTestAtJoinNode {
  field_of_arg1: WMEFieldType;
  field_of_arg2: WMEFieldType;
  ix_in_token_of_arg2: number;

  constructor(field_of_arg1: WMEFieldType, field_of_arg2: WMEFieldType, ix_in_token_of_arg2: number) {
    this.field_of_arg1 = field_of_arg1;
    this.field_of_arg2 = field_of_arg2;
    this.ix_in_token_of_arg2 = ix_in_token_of_arg2;
  }

  equals(other: TestAtJoinNode) {
    return this.field_of_arg1 == other.field_of_arg1 &&
      this.field_of_arg2 == other.field_of_arg2 &&
      this.ix_in_token_of_arg2 == other.ix_in_token_of_arg2;
  }

  test(t: Token, w: WME) {
    const arg1 = w.get_field(this.field_of_arg1);
    const wme2 = t.index(this.ix_in_token_of_arg2);
    const arg2 = wme2.get_field(this.field_of_arg2);
    if (arg1 != arg2) return false;
    return true;
  }

  toString() {
    let s  = "(test-at-join α[";
    s += this.field_of_arg1 + "] ==  β" +
      this.ix_in_token_of_arg2 + "[" + this.field_of_arg2  + "]";
    s += ")";
    return s;
  }
}



/// pg 24
class JoinNode extends Identifiable {
  amem_src: AlphaMemory;
  bmem_src: BetaMemory | null;

  children: BetaMemory[] = [];
  tests: AbstractTestAtJoinNode[] = [];

  constructor(amem_src: AlphaMemory, bmem_src: BetaMemory | null) {
    super();
    this.amem_src = amem_src;
    this.bmem_src = bmem_src;
  }

  alpha_activation(w: WME, add: boolean) {
    strict.strict(this.amem_src, "α memory must exist");
    if(Rete.debug) console.log('α-activation| #' + this.id + ' ' + (add?"[add]":"[del]") + this + ' on ' + w);
    if (this.bmem_src) {
      for (const t of this.bmem_src.items) {
        if(t.nccResults && t.nccResults.length) continue;
        if (!this.perform_join_tests(t, w)) continue;
        for (const child of this.children) child.join_activation(t, w, add);
      }
    } else {
      for (const child of this.children) {
        child.join_activation(null, w, add);
      }
    }
  }

  beta_activation(t: Token | null, add: boolean) {
    strict.strict(this.amem_src, "α memory must exist");
    if(Rete.debug) console.log('β-activation| ' + (add?"[add]":"[del]") + this + ' on ' + t);
    for (const w of this.amem_src.items) {
      if (!this.perform_join_tests(t, w)) continue;
      for (const child of this.children) {
        child.join_activation(t, w, add);
      }
    }
  }

  perform_join_tests(t: Token | null, w: WME) {
    if (!this.bmem_src) return true;
    strict.strict(this.amem_src, "α memory must exist");

    if (t) {
      if(Rete.debug) console.log('perform_join_tests| '+this+' on '+t+ ' and '+w);
      for (const test of this.tests) {
        if(!test.test(t,w)) return false;
      }
    }
    return true;
  }

  toString() {
    let s = "(join #" + this.id + " α-mem:" + this.amem_src + ' β-mem: ' + this.bmem_src + ' tests:';
    for (const test of this.tests) {
      s += test;
    }
    s += ")";
    return s;
  }
}

// pg 37: inferred
export class ProductionNode extends BetaMemory {
  rhs: string;
  oldItems: Token[] = [];
  locationsOfAllVariablesInConditions: LocationsOfVariablesInConditions;

  constructor(parent: JoinNode, rhs: string, locationsOfAllVariablesInConditions: LocationsOfVariablesInConditions) {
    super(parent);
    this.rhs = rhs;
    this.locationsOfAllVariablesInConditions = locationsOfAllVariablesInConditions;
  }

  join_activation(t: Token | null, w: WME, add: boolean) {
    if (add) {
      t = new Token(w, t);
      this.items.push(t);
      if(Rete.debug) console.log("## (PROD " + t + " ~ " + this.rhs + ") ##\n");
    } else {
      const toRemove = this.items.filter(t1 => tokenIsParentAndWME(t1, t, w));
      this.items = this.items.filter(t1 => !tokenIsParentAndWME(t1, t, w));
      for(let tokenToRemove of toRemove){
        if(Rete.debug) console.log("## (PROD UNDO " + tokenToRemove + " ~ " + this.rhs + ") ##\n");
      }
    }
  }

  willFire() : [Token[], Token[]] {
    return this.willFireCommittable(true);
  }

  canFire() : [Token[], Token[]] {
    return this.willFireCommittable(false);
  }

  willFireTokenAdded(t: Token): boolean {
    if(this.oldItems.find(x => x.equalTo(t))) {
      return false; //Already fired
    }
    if(!this.items.find(x => x.equalTo(t))) {
      return false; //Not found
    }
    this.oldItems.push(t);
    return true;
  }

  private willFireCommittable(commit: boolean) {
    const itemsToRemoveOnFiring: Token[] = [];
    const itemsToAddOnFiring: Token[] = [];
    for (const item of this.items) {
      if (!this.oldItems.find(t => t.equalTo(item))) {
        itemsToAddOnFiring.push(item);
      }
    }
    for (const item of this.oldItems) {
      if (!this.items.find(t => t.equalTo(item))) {
        itemsToRemoveOnFiring.push(item);
      }
    }
    const ret: [Token[], Token[]] = [itemsToAddOnFiring, itemsToRemoveOnFiring];
    if (commit) {
      this.oldItems = [...this.items];
    }
    return ret;
  }

  toString() {
    return "(production " + this.rhs + ")";
  }
}

function tokenIsParentAndWME(t: Token, parent: Token|null, w: WME): boolean {
  return t.parent == parent && t.wme === w;
}

export class NccNode extends BetaMemory {
  nccPartnerNode: NccPartnerNode;

  constructor(parent: JoinNode, nccPartnerNode: NccPartnerNode) {
    super(parent);
    this.nccPartnerNode = nccPartnerNode;
    this.nccPartnerNode.nccNode = this;
  }

  join_activation(t: Token | null, w: WME, add: boolean) {
    let fullToken: Token;
    if(Rete.debug) console.log('join_activation' + (add?"[add]":"[del]") + '| ' + this + ' on ' + t + ' and '+ w);
    if (add) {
      fullToken = new Token(w, t);
      fullToken.nccResults = [];
      this.items = [fullToken, ...this.items];
      //remove result from node.partner.new-result-buffer
      // insert result at the head of new-token.ncc-results
      // result.owner <- new-token
      const found = this.nccPartnerNode.items.find(t1 => {
        const [owner_t, owner_w] = findOwnerTokenConstituents(t1.parent, t1.wme, this.nccPartnerNode.numberOfConjuncts);
        return tokenIsParentAndWME(fullToken, owner_t, owner_w);
      });
      if (found) {
        fullToken.addToNccResults(found);
      }
      if (fullToken.nccResults.length === 0) {
        for (let child of this.children) {
          child.beta_activation(fullToken, add);
        }
      }
    } else {
      const fullToken = this.items.find(t1 => tokenIsParentAndWME(t1, t, w));
      if(!fullToken) {
        console.error(`ncc-node #${this.id}: Did not find token with WME=${w.toString()} and parent=${t?.toString()}`);
        return;
      }
      for (let child of this.children) {
        child.beta_activation(fullToken, add);
      }
      this.items = this.items.filter(t1 => t1 !== fullToken);
    }
  }

  toString() {
    let s  = "(ncc-node #" + this.id + " items: (";
    for(let item of this.items) {
      s += item + ' ';
    }
    s += ")| " + this.children.length + " children";
    s += ")";
    return s;
  }
}

export class NccPartnerNode extends BetaMemory {
  numberOfConjuncts: number
  nccNode: NccNode | null = null;

  constructor(parent: JoinNode, numberOfConjuncts: number) {
    super(parent);
    this.numberOfConjuncts = numberOfConjuncts;
  }

  join_activation(t: Token | null, w: WME, add: boolean) {
    let fullToken: Token;
    if(Rete.debug) console.log('join_activation' + (add?"[add]":"[del]") + '| ' + this + ' on ' + t + ' and '+ w);
    if (add) {
      fullToken = new Token(w, t);
      const [owner_t, owner_w] = findOwnerTokenConstituents(t, w, this.numberOfConjuncts);
      const found = this.nccNode && this.nccNode.items.find(t1 => tokenIsParentAndWME(t1, owner_t, owner_w));
      if(found) {
        found.addToNccResults(fullToken);
        for (const child of this.nccNode!.children) {
          child.beta_activation(found, false);
        }
      } else {
        this.items = [fullToken, ...this.items];
      }
    } else {
      const foundHere = this.items.find(t1 => tokenIsParentAndWME(t1, t, w));
      if (foundHere) {
        fullToken = foundHere;
        this.items = this.items.filter(t1 => t1 !== fullToken);
      } else {
        const [owner_t, owner_w] = findOwnerTokenConstituents(t, w, this.numberOfConjuncts);
        const found = this.nccNode && this.nccNode.items.find(t1 => tokenIsParentAndWME(t1, owner_t, owner_w));
        if(found) {
          found.removeFromNccResults(t, w);
          if (found.nccResults?.length === 0) {
            for (const child of this.nccNode!.children) {
              child.beta_activation(found, true);
            }
          }
        }

      }
    }
  }

  toString() {
    let s  = "(ncc-partner-node #" + this.id + " items: (";
    for(let item of this.items) {
      s += item + ' ';
    }
    s += ")| " + this.children.length + " children";
    s += ")";
    return s;
  }
}

export class AggregateNode extends BetaMemory {
  numberOfConjuncts: number
  alpha: AlphaMemory;
  tokensByOwnerToken: {owner: Token, tokens: Token[]}[] = [];
  aggregateComputation: AggregateComputation<any>;

  constructor(parent: JoinNode, numberOfConjuncts: number, aggregateComputation: AggregateComputation<any>, amem: AlphaMemory) {
    super(parent);
    this.numberOfConjuncts = numberOfConjuncts;
    this.aggregateComputation = aggregateComputation;
    this.alpha = amem;
  }

  join_activation(t: Token | null, w: WME, add: boolean) {
    let fullToken: Token;
    if(Rete.debug) console.log('join_activation' + (add?"[add]":"[del]") + '| ' + this + ' on ' + t + ' and '+ w);
    if (add) {
      fullToken = new Token(w, t);
      const owner_t = findOwnerToken(t!, this.numberOfConjuncts - 1);
      const found = this.alpha.items.find(w => w.fields[2] === owner_t);
      if(found) {
        this.alpha.items = this.alpha.items.filter(w => w !== found);
        for (const j of this.alpha.successors) {
          j.alpha_activation(found!, false);
        }
      }
      let foundEntry = this.tokensByOwnerToken.find(tb => tb.owner === owner_t);
      if(!foundEntry) {
        foundEntry = { owner: owner_t, tokens: []};
        this.tokensByOwnerToken.push(foundEntry);
      }
      foundEntry.tokens.push(fullToken);
      const aggregateOnTokens = computeAggregateOnTokens(foundEntry.tokens, this.aggregateComputation);
      const wme = new WME(aggregateOnTokens, '#token', owner_t);
      this.alpha.items.push(wme);
      for (const j of this.alpha.successors) {
        j.alpha_activation(wme, true);
      }
      this.items = [fullToken, ...this.items];
    } else {
      const foundHere = this.items.find(t1 => tokenIsParentAndWME(t1, t, w));
      if (foundHere) {
        fullToken = foundHere;
        const owner_t = findOwnerToken(fullToken, this.numberOfConjuncts );
        const found = this.alpha.items.find(w => w.fields[2] === owner_t);
        if(found) {
          this.alpha.items = this.alpha.items.filter(w => w !== found);
          for (const j of this.alpha.successors) {
            j.alpha_activation(found!, false);
          }
        }
        let foundEntry = this.tokensByOwnerToken.find(tb => tb.owner === owner_t);
        if(foundEntry) {
          foundEntry.tokens = foundEntry.tokens.filter(t => t !== fullToken);
          const aggregateOnTokens = computeAggregateOnTokens(foundEntry.tokens, this.aggregateComputation);
          const wme = new WME(aggregateOnTokens, '#token', owner_t);
          this.alpha.items.push(wme);
          for (const j of this.alpha.successors) {
            j.alpha_activation(wme, true);
          }
        }
        this.items = this.items.filter(t1 => t1 !== fullToken);
      }
    }
  }

  toString() {
    let s  = "(aggregate-node #" + this.id + " items: (";
    for(let item of this.items) {
      s += item + ' ';
    }
    s += ")| " + this.children.length + " children";
    s += ")";
    return s;
  }
}

function findOwnerTokenConstituents(t: Token | null, w: WME, steps: number): [Token | null, WME] {
  if(steps === 0 || t === null) return [t, w];
  return findOwnerTokenConstituents(t.parent, t.wme, steps - 1);
}

function findOwnerToken(t: Token, steps: number): Token {
  if(steps === 0 || t.parent === null) return t!;
  return findOwnerToken(t.parent, steps - 1);
}

type StringToStringMap = { [key: string]: string };

// no page; hold all global state
export class Rete {
  alpha_top: TestNode;
  // alphabetically ordered for ease of use
  alphamemories: AlphaMemory[] = [];
  betamemories: BetaMemory[] = [];
  consttestnodes: TestNode[] = [];
  joinnodes: JoinNode[] = [];
  productions: ProductionNode[] = [];

  // inferred from page 35: build_or_share_alpha memory:
  // { initialize am with any current WMEs }
  // presupposes knowledge of a collection of WMEs
  working_memory: WME[] = [];

  fuzzySystems: FuzzyVariable[] = [];

  constructor() {
    this.alpha_top = new DummyTestNode();
    this.consttestnodes.push(this.alpha_top);
  }

  findWME(id: any, attr: any, val: any) {
    const found = this.working_memory.find(w => w.fields[0] === id && w.fields[1] === attr && w.fields[2] === val);
    return found;
  }

  addWME(w: WME) {
    addWME(this, w, true);
  }

  add(id: any, attr: any, val: any, mu: number | undefined = undefined): WME | null {
    const found = this.findWME(id, attr, val);
    if(!found) {
      const wme = mu === undefined ? new WME(id, attr, val) : new FuzzyWME(id, attr, val, mu);
      this.addWME(wme);
      return wme;
    }
    return null;
  }

  removeWME(w: WME) { //NB. this must be an actual WME in WM, not a clone
    addWME(this, w, false);
  }

  addProduction(lhs: GenericCondition[], rhs: string): ProductionNode {
    return add_production(this, lhs, rhs);
  }

  removeProduction(p: ProductionNode) {
    remove_production(this, p);
  }

  query(conds: GenericCondition[], variables: string[]): StringToStringMap[] {
    return query(this, conds, variables);
  }

  getIncompleteTokensForProduction(rhs: string) {
    return get_incomplete_tokens_for_production(this, rhs);
  }

  addFuzzyVariable(fs: FuzzyVariable) {
    this.fuzzySystems.push(fs);
  }

  isFuzzySystem(fsn: string) {
    return !!this.fuzzySystems.find(fs => fs.getName() === fsn);
  }

  getFuzzySystem(fsn: string) {
    const found = this.fuzzySystems.find(fs => fs.getName() === fsn);
    strict.strict(found, `Fuzzy variable ${fsn} was not found on any Fuzzy system`);
    return found;
  }

  isFuzzyDomainVariable(fuzzyVariable: string, fuzzyValue: string) {
    if(!this.isFuzzySystem(fuzzyVariable)) return false;
    const fuzzySystem = this.getFuzzySystem(fuzzyVariable);
    return fuzzySystem.isFuzzyValue(fuzzyValue);
  }

  addWMEsFromConditions(conds: GenericCondition[], variableValues?: StringToStringMap, mu: number | undefined = undefined) {
    return add_wmes_from_conditions(this, conds, variableValues, mu);
  }

  static debug: boolean = false;
}

function add_wmes_from_conditions(
  r: Rete,
  conds: GenericCondition[],
  variableValues?: StringToStringMap,
  mu: number | undefined = undefined,
  ): [WME[], WME[]] {
  const ret: [WME[], WME[]] = [[],[]];
  //Find all "as" variables
  const condVars: {[variable: string] : Condition} = {};
  for (const cond of conds) {
    strict.strict(
      !(cond instanceof PositiveCondition) && !(cond instanceof NegativeCondition) && !(cond instanceof AggregateCondition),
      'Only plain Conditions are allowed'
    );

    if(cond.wholeWmeVar) {
      strict.strict(!variableValues?.[cond.wholeWmeVar],  'Values are not allowed to be provided for WME variables');
      condVars[cond.wholeWmeVar] = cond;
    }
  }
  const plainConditions = (conds as Condition[])
    .map(c => {
      const condition = new Condition(
        new Field(c.attrs[0].type, c.attrs[0].v),
        new Field(c.attrs[1].type, c.attrs[1].v),
        new Field(c.attrs[2].type, c.attrs[2].v)
      );
      if(c.wholeWmeVar) {
        condition.wholeWmeVar = c.wholeWmeVar;
      }
      return condition;
    });

  //plug any given values for variables
  if (variableValues) {
    for (const cond of plainConditions) {
      for (const attr of cond.attrs) {
        if(attr.type === FieldType.Var && variableValues[attr.v]) {
          attr.type = FieldType.Const;
          attr.v = variableValues[attr.v];
        }
      }
    }
  }

  //replace internal variables with fresh symbols
  const generatedSymbols: {[variable: string]: string} = {};
  for (const cond of plainConditions) {
    for (const attr of cond.attrs) {
      if(attr.type === FieldType.Var && !(attr.v in condVars)) {
        if (!generatedSymbols[attr.v]) {
          generatedSymbols[attr.v] = `gensym-${idCounter++}`;
        }
        attr.type = FieldType.Const;
        attr.v = generatedSymbols[attr.v];
      }
    }
  }
  //only "as" variables are left, at this point
  const conditionsPerDepth: {[n: number]: Condition[]} = {};
  const orderedConditionsByDepth: Condition[] = [];
  function findConditionsOfDepth(n: number) {
    if(n === 0) {
      return plainConditions.filter(c => c.wholeWmeVar && c.attrs.every(f => f.type === FieldType.Const));
    } else {
      return plainConditions.filter(c => !orderedConditionsByDepth.includes(c) && c.attrs.some(f => f.type === FieldType.Var) &&
        c.attrs.filter(f => f.type === FieldType.Var).every(f => orderedConditionsByDepth.includes(condVars[f.v])));
    }
  }
  let targetDepth = 0;
  do {
    const conditionsOfDepth = findConditionsOfDepth(targetDepth);
    if(!conditionsOfDepth.length) break;
    conditionsPerDepth[targetDepth] = conditionsOfDepth;
    orderedConditionsByDepth.push(...conditionsOfDepth);
    targetDepth++;
  } while(targetDepth < conds.length); //just in case
  //add WMEs one by one, replacing "as" variables of previous facts
  const remainingConditions = plainConditions.filter(c => !orderedConditionsByDepth.includes(c));
  const wmeVars: {[variable: string] : WME | null} = Object.fromEntries(Object.entries(condVars).map(([v,_]) => [v, null]));
  for (const cond of [...orderedConditionsByDepth, ...remainingConditions]) {
    const values: any[] = [];
    for (const attr of cond.attrs) {
      if(attr.type === FieldType.Var) {
        const wme = wmeVars[attr.v];
        //if unresolved variables remain, then this means there's a cycle
        strict.strict(wme, 'Variable not resolved');
        values.push(wme);
      } else {
        values.push(attr.v);
      }
    }
    const added = r.add(values[0], values[1], values[2], mu);
    if (added) {
      ret[0].push(added);
      if (cond.wholeWmeVar) {
        wmeVars[cond.wholeWmeVar] = added;
      }
    } else {
      const foundWME = r.findWME(values[0], values[1], values[2]);
      if(foundWME) {
        ret[1].push(foundWME);
      }
    }
  }
  return ret;
}

function wme_to_condition(w: WME): Condition {
  const fs = w.fields.map(f => Field.constant(f));
  return new Condition(fs[0], fs[1], fs[2]);
}

function token_to_conditions(t: Token): Condition[] {
  const conditions: Condition[] = new Array<Condition>(t.token_chain_ix + 1);
  function traverseToken(t: Token, conditions: Condition[]) {
    conditions[t.token_chain_ix] = wme_to_condition(t.wme);
    if(!t.parent) return conditions;
    return traverseToken(t.parent, conditions);
  }
  return traverseToken(t, conditions);
}

function get_incomplete_tokens_for_production(r: Rete, rhs: string): Condition[][] {
  const p = r.productions.find(p => p.rhs === rhs);
  if(!p || p.items.length) return []; //Production is in conflict set already
  function reconstruct_path(j: JoinNode, path: JoinNode[]): JoinNode[] {
    path.push(j);
    // path.push(j);
    if(j.bmem_src === null) {
      return path;
    }
    return reconstruct_path(j.bmem_src.parent, path);
  }
  const path = reconstruct_path(p.parent, []);
  const index: number = path.findIndex(j => j.bmem_src?.items.length);
  const tokensAtIndex = path[index].bmem_src!.items;
  const conditionsArrays = tokensAtIndex.map(token_to_conditions);
  let newVarIndex = 0;
  // console.log('Conditions:');
  // for (const conditionsArray of conditionsArrays) {
  //   console.log(conditionsArray.map(c => c.toString()).join(' '));
  // }
  for (const conditionsArray of conditionsArrays) {
    for(let i= index; i < path.length - 1; i++) {
      const joinNode = path[i];
      const fields: (Field | null)[] = [null, null, null];
      const tests = joinNode.tests;
      for (const test of tests) {
        if (test instanceof TestAtJoinNode) {
          const condition = conditionsArray[test.ix_in_token_of_arg2];
          strict.strict(condition.attrs[test.field_of_arg2]?.type === FieldType.Const, `Condition field ${test.field_of_arg2} must be a constant`);
          strict.strict(fields[test.field_of_arg1] === null, `Field ${test.field_of_arg1} already has a value`);
          fields[test.field_of_arg1] = condition.attrs[test.field_of_arg2];
        }
      }
      const notAllFieldsSpecified = fields.includes(null);
      if(notAllFieldsSpecified) {
        let testNode: TestNode | null = joinNode.amem_src.parent;
        while(testNode !== null) {
          if(testNode instanceof ConstTestNode) {
            const fieldToTest = fields[testNode.field_to_test];
            if(fieldToTest === null) {
              fields[testNode.field_to_test] = Field.constant(testNode.field_must_equal);
            } else if(fieldToTest.type === FieldType.Const) {
              strict.strict(fieldToTest.v === testNode.field_must_equal, "Fields should have been equal");
            } else if(fieldToTest.type === FieldType.Var) {
              const indexesOfVar = fields
                .map((f,i) => [f,i] as [Field,number])
                .filter(([f,_]:[Field,number]) => f !== fieldToTest && f.type === FieldType.Var && f.v === fieldToTest.v)
                .map(([_,i]:[Field,number]) => i);
              for (const index of indexesOfVar) {
                fields[index] = Field.constant(testNode.field_must_equal);
              }
            }
          } else if(testNode instanceof IntraTestNode) {
            if(fields[testNode.first_field]?.type === FieldType.Const && fields[testNode.second_field]?.type === FieldType.Const) {
              strict.strict(fields[testNode.first_field]?.v === fields[testNode.second_field]?.v, 'Variables should have been the same variable')
            } else if(fields[testNode.first_field]?.type === FieldType.Var && fields[testNode.second_field]?.type === FieldType.Var) {
              fields[testNode.second_field] = fields[testNode.first_field];
            } else if(fields[testNode.first_field]?.type === FieldType.Var) {
              fields[testNode.first_field] = fields[testNode.second_field];
            } else {
              fields[testNode.second_field] = fields[testNode.first_field];
            }
          }
          testNode = testNode.parent;
        }
      }
      for (let i1 = 0; i1 < fields.length; i1++){
        const field = fields[i1];
        if(field === null) {
          fields[i1] = Field.var(`_${newVarIndex++}`);
        }
      }
      const newCondition = new Condition(fields[0]!, fields[1]!, fields[2]!);
      conditionsArray.push(newCondition);
    }
  }
  return conditionsArrays;
}

// pg 21
function alpha_memory_activation(node: AlphaMemory, w: WME, add: boolean) {
  if (add) {
    node.items = [(w), ...node.items];
  }
  if(Rete.debug) console.log("alpha_memory_activation" + (add?"[add]":"[del]") + "| node: " + node + " | wme: " + w + "\n");
  for (const child of node.successors) {
    child.alpha_activation(w, add);
  }
  if(!add) {
    node.items = node.items.filter(w1 => w1 !== w);
  }
}

// pg 15
// return whether test succeeded or not.
function const_test_node_activation(node: TestNode, w: WME, add: boolean) {
  if(Rete.debug) console.log ("const_test_node_activation" + (add?"[add]":"[del]") + "| node: " + node + " | wme: " + w);
  if (!node.testWme(w)) {
    return false;
  }
  if (node.output_memory) {
    alpha_memory_activation(node.output_memory, node.wme_to_propagate(w), add);
  }
  for(let i = 0; i < w.fields.length; i++) {
    if (typeof w.fields[i] === 'string') {
      const hashtableElementElement = node.hashtable[i]?.[w.fields[i] as string];
      if (hashtableElementElement) {
        for (const c of hashtableElementElement) {
          if (const_test_node_activation(c, w, add)) {
            break;
          }
        }
      }
    }
  }
  for (const c of node.children) {
    const_test_node_activation(c, w, add);
  }
  return true;
}

// pg 14
function addWME(r: Rete, w: WME, add: boolean) {
  if (add) {
    r.working_memory.push(w);
  }
  const_test_node_activation(r.alpha_top, w, add);
  if(!add) {
    const lengthBefore = r.working_memory.length;
    r.working_memory = r.working_memory.filter(w1 => w1 !== w);
    strict.strict(r.working_memory.length < lengthBefore, 'No WME was removed');
  }
}


// pg 38
function update_new_node_with_matches_from_above(beta: BetaMemory) {
  const join = beta.parent;
  const savedListOfChildren = join.children;
  // WTF?
  join.children = [ beta ];

  // push alpha memory through join node.
  for(const item of join.amem_src.items) {
    join.alpha_activation(item, true);
  }
  join.children = savedListOfChildren;
}

// pg 34
function build_or_share_beta_memory_node(r: Rete, parent: JoinNode) {
  if (parent.children.length) { return parent.children[0]; }

  const newbeta = new BetaMemory(parent);
  r.betamemories.push(newbeta);
  if(Rete.debug) console.log(`build_or_share_beta_memory_node newBeta: %${newbeta} | parent: %${newbeta.parent}`);
  //newbeta->children = nullptr;
  //newbeta->items = nullptr;
  parent.children.push(newbeta);
  update_new_node_with_matches_from_above(newbeta);
  return newbeta;
}

// pg 34
function build_or_share_join_node(
  r: Rete,
  bmem: BetaMemory | null,
  amem: AlphaMemory,
  tests: AbstractTestAtJoinNode[]
) {
  // bmem can be nullptr in top node case.
  // assert(bmem != nullptr);
  strict.strict(amem !== null, "α memory must exist");

  const newjoin = new JoinNode(amem, bmem);
  r.joinnodes.push(newjoin);
  newjoin.tests = tests;
  amem.successors=[(newjoin), ...amem.successors];
  if (bmem ) { bmem.children.push(newjoin); }
  return newjoin;
}

// inferred from discussion
export enum FieldType {
  Const = 0,
  Var = 1
}

// inferred from discussion
export class Field {
  type: FieldType;
  v: string;

  constructor(type: FieldType, v: string) {
    this.type = type;
    this.v = v;
  }

  static var(name: string) {
    return new Field(FieldType.Var, name);
  }

  static constant(name: string) {
    return new Field(FieldType.Const, name);
  }

  toString() {
    switch (this.type) {
      case FieldType.Var: return `<${this.v}>`;
      case FieldType.Const: return quoteIfNeeded(this.v);
    }
  }
}

export function quoteIfNeeded(s: string): string {
  const letters = s.split('');
  if(letters
    .find(c => [' ', '\t', '\r', '\n', "'", '"'].includes(c))) {
    if(!letters.find(c => c === "'")) {
      return `'${s}'`;
    } else if(!letters.find(c => c === '"')) {
      return `""${s}"`;
    } else {
      strict.strict(false, "Cannot quote with either single of double quotes")
    }
  }
  return s;
}

export interface ConditionArithExpression {
  compileFromConditions(c: Condition, earlierConds: GenericCondition[]): ArithExpression;
  variables(): string[];
}

export class ConditionArithVar implements ConditionArithExpression {
  v: string;

  constructor(v: string) {
    this.v = v;
  }

  compileFromConditions(c: Condition, earlierConds: Condition[]): ArithExpression {
    for(let f = 0; f < WMEFieldType.NumFields; ++f) {
      if (c.attrs[f].type != FieldType.Var) continue;
      if(c.attrs[f].v === this.v) return new VarExpression(f);
    }
    const [i, f2] = lookup_earlier_cond_with_field(earlierConds, this.v);
    if (i == -1)  {
      strict.strict(f2 == -1, 'Field position found but variable was not found');
    }
    strict.strict(i != -1, 'Variable not found');
    strict.strict(f2 != -1, 'Variable not found');
    return new VarExpression(f2, i);
  }

  variables(): string[] {
    return [this.v];
  }

  toString() {
    return "<" + this.v + ">";
  }
}

export class ConditionArithConst implements ConditionArithExpression {
  v: number;

  constructor(v: number) {
    this.v = v;
  }

  compileFromConditions(c: Condition, earlierConds: Condition[]): ArithExpression {
    return new ConstExpression(this.v);
  }

  variables(): string[] {
    return [];
  }

  toString() {
    return this.v;
  }
}

export class ConditionSymbolicConst implements ConditionArithExpression {
  v: string;

  constructor(v: string) {
    this.v = v;
  }

  compileFromConditions(c: Condition, earlierConds: Condition[]): ArithExpression {
    return new ConstSymbolicExpression(this.v);
  }

  variables(): string[] {
    return [];
  }

  toString() {
    return this.v;
  }
}

export class ConditionArithBinaryOp implements ConditionArithExpression {
  op: ArithOp;
  leftOperand: ConditionArithExpression;
  rightOperand: ConditionArithExpression;

  constructor(leftOperand: ConditionArithExpression, op: ArithOp, rightOperand: ConditionArithExpression) {
    this.op = op;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
  }

  compileFromConditions(c: Condition, earlierConds: Condition[]): ArithExpression {
    const leftArithExpression = this.leftOperand.compileFromConditions(c, earlierConds);
    const rightArithExpression = this.rightOperand.compileFromConditions(c, earlierConds);
    return new BinaryOpExpression(leftArithExpression, this.op, rightArithExpression);
  }

  variables(): string[] {
    const leftVariables = this.leftOperand.variables();
    const rightVariables = this.rightOperand.variables();
    return [...leftVariables, ...rightVariables];
  }

  toString() {
    return "(" + this.leftOperand + " " + this.op + " " + this.rightOperand + ")";
  }
}

export class ConditionArithTest {
  comp: CompOp;
  leftOperand: ConditionArithExpression;
  rightOperand: ConditionArithExpression;

  constructor(leftOperand: ConditionArithExpression, comp: CompOp, rightOperand: ConditionArithExpression) {
    this.comp = comp;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
  }

  compileFromConditions(c: Condition, earlierConds: GenericCondition[]): ArithTestNode {
    const leftArithExpression = this.leftOperand.compileFromConditions(c, earlierConds);
    const rightArithExpression = this.rightOperand.compileFromConditions(c, earlierConds);
    return new ArithTestNode(null, leftArithExpression, this.comp, rightArithExpression);
  }

  variables(): string[] {
    const leftVariables = this.leftOperand.variables();
    const rightVariables = this.rightOperand.variables();
    return [...leftVariables, ...rightVariables];
  }

  toString() {
    return "(" + this.leftOperand + " " + this.comp + " " + this.rightOperand + ")";
  }
}

// inferred from discussion
export class Condition {
  attrs: Field[];
  intraArithTests: ConditionArithTest[] = [];
  extraArithTests: ConditionArithTest[] = [];
  wholeWmeVar ?: string;

  constructor(ident: Field, attr: Field, val: Field) {
    this.attrs = [ident, attr, val];
  }

  variables(): string[] {
    const set = new Set<string>();
    for (const attr of this.attrs) {
      if(attr.type === FieldType.Var) {
        set.add(attr.v);
      }
    }
    return Array.from(set);
  }

  toString() {
    const intraTestsString = this.intraArithTests.map(t => t.toString()).join();
    const extraTestsString = this.extraArithTests.map(t => t.toString()).join();
    return `(${this.attrs.map(f => f.toString()).join(' ')})${intraTestsString}${extraTestsString}` + (this.wholeWmeVar ? ` as <${this.wholeWmeVar}>` : '');
  }
}

export class NegativeCondition {
  negativeConditions: GenericCondition[] = [];

  constructor(negativeConditions: GenericCondition[]) {
    this.negativeConditions = negativeConditions;
  }

  toString(): string {
    return '-{' + this.negativeConditions.map(c => c.toString()).join(',') + '}';
  }
}

export class PositiveCondition {
  positiveConditions: GenericCondition[] = [];

  constructor(positiveConditions: GenericCondition[]) {
    this.positiveConditions = positiveConditions;
  }

  toString(): string {
    return '+{' + this.positiveConditions.map(c => c.toString()).join(',') + '}';
  }
}

export abstract class AggregateComputation<T> {
  locationInToken: LocationsOfVariablesInConditions = {};
  abstract variables(): string[];
  abstract init(): T;
  abstract mapper(map: StringToStringMap): T;
  abstract reducer(v1: T, v2: T): T;
  finalizer(v: T): string {
    return (v as any).toString();
  }
}

export class AggregateCount extends AggregateComputation<number> {
  init() {
    return 0;
  }

  mapper(map: StringToStringMap): any {
    return 1;
  }

  reducer(v1: any, v2: any): any {
    return v1 + v2;
  }

  variables(): string[] {
    return [];
  }

  toString(): string {
    return '#COUNT()';
  }
}

export class AggregateExist extends AggregateComputation<number> {
  init() {
    return 0;
  }

  mapper(map: StringToStringMap): any {
    return 1;
  }

  reducer(v1: any, v2: any): any {
    return 1;
  }

  variables(): string[] {
    return [];
  }

  toString(): string {
    return '#EXIST()';
  }
}

export class AggregateSum extends AggregateComputation<number> {
  variable: string;

  init() {
    return 0;
  }

  constructor(variable: string) { //todo allow full expression
    super();
    this.variable = variable;
  }

  mapper(map: StringToStringMap): number {
    return map[this.variable] ? +map[this.variable] : 0;
  }

  reducer(v1: number, v2: number): number {
    return v1 + v2;
  }

  variables(): string[] {
    return [this.variable];
  }

  toString(): string {
    return '#SUM(<' + this.variable + '>)';
  }
}

function computeAggregateOnTokens(tokens: Token[], aggr: AggregateComputation<any>): string {
  const variables = aggr.variables();
  const locationInToken = aggr.locationInToken;
  const mappedTokens = tokens.map(t => evalVariablesInToken(Object.keys(locationInToken), locationInToken,t));
  const evaledTokens = mappedTokens.map(m => aggr.mapper(m));
  const reduced = evaledTokens.reduce((a,b) => aggr.reducer(a,b), aggr.init());
  const finalValue = aggr.finalizer(reduced);
  return finalValue;
}

export class AggregateCondition extends Condition {
  innerConditions: GenericCondition[] = [];
  aggregateComputation: AggregateComputation<any>;

  constructor(variable: string, aggregateComputation: AggregateComputation<any>, innerConditions: GenericCondition[]) {
    super(Field.var(variable), Field.constant('<-'), Field.constant(aggregateComputation.toString()));
    this.innerConditions = innerConditions;
    this.aggregateComputation = aggregateComputation;
  }

  toString(): string {
    return super.toString() +' from {' + this.innerConditions.map(c => c.toString()).join(',') + '}';
  }
}

export type GenericCondition = Condition | NegativeCondition| PositiveCondition | AggregateCondition;

// implicitly defined on pg 35
function lookup_earlier_cond_with_field(
  earlierConds: GenericCondition[],
  v: string,
) {
  let i: number = earlierConds.length - 1;
  let f2: number = -1;

  for(let it = i; it >= 0; --it) {
    if(earlierConds[it] instanceof Condition) {
      const cond: Condition = earlierConds[it] as Condition;
      if(cond?.wholeWmeVar == v) return [i, WMEFieldType.Whole];
      for (let j = 0; j < WMEFieldType.NumFields; ++j) {
        if (cond.attrs[j].type != FieldType.Var) continue;
        if (cond.attrs[j].v == v) {
          f2 = j;
          return [i, f2];
        }
      }
    }
    i--;
  }
  i = f2 = -1;
  return [i,f2];
}

// pg 35
// pg 35: supposedly, nearness is not a _hard_ requiement.
function get_join_tests_from_condition(
  _: Rete,
  c: Condition,
  earlierConds: GenericCondition[]
) {
  const result: AbstractTestAtJoinNode[] = [];

  for(let f = 0; f < WMEFieldType.NumFields; ++f) {
    if (c.attrs[f].type != FieldType.Var) continue;
    // each occurence of variable v
    const v = c.attrs[f].v;
    const [i, f2] = lookup_earlier_cond_with_field(earlierConds, v);
    // nothing found
    if (i == -1)  {
      strict.strict(f2 == -1, 'Field position found but variable was not found');
      continue;
    }
    if (i == -1)  {
    }
    strict.strict(i != -1, 'Variable not found');
    strict.strict(f2 != -1, 'Variable not found');
    const test = new TestAtJoinNode(f, f2, i);
    result.push(test);
  }
  const extraArithTests = c.extraArithTests;
  for (const arithTest of extraArithTests) {
    const arithTestNode = arithTest.compileFromConditions(c, earlierConds);
    result.push(arithTestNode);
  }
  return result;
}

// page 36
function build_or_share_constant_test_node(
  r: Rete,
  parent: TestNode,
  f: WMEFieldType,
  sym: string
) {
  // look for pre-existing node
  const hashtableElementElement = parent.hashtable[f]?.[sym];
  if (hashtableElementElement) {
    for (const child of hashtableElementElement) {
      if (child instanceof ConstTestNode) {
        if (child.field_to_test == f && child.field_must_equal == sym) {
          return child;
        }
      }
    }
  }
  // build a new node
  const newnode = new ConstTestNode(f, sym, null, parent);
  r.consttestnodes.push(newnode);
  if(Rete.debug) console.log(`build_or_share_constant_test_node newconsttestnode: %${newnode}`);
  if(!parent.hashtable[f]) {
    parent.hashtable[f] = {};
  }
  if(!parent.hashtable[f][sym]) {
    parent.hashtable[f][sym] = [];
  }
  parent.hashtable[f][sym].push(newnode);
  // newnode->field_to_test = f; newnode->field_must_equal = sym;
  // newnode->output_memory = nullptr;
  // newnode->children = nullptr;
  return newnode;
}

function build_or_share_intra_test_node(
  r: Rete,
  parent: TestNode,
  f1: WMEFieldType,
  f2: WMEFieldType
) {
  strict.strict(parent != null, 'Parent cannot be null');
  // look for pre-existing node
  for (const child of parent.children) {
    if(child instanceof IntraTestNode) {
      if (child.first_field == f1 && child.second_field == f2) {
        return child;
      }
    }
  }
  // build a new node
  const newnode = new IntraTestNode(f1, f2, null, parent);;
  r.consttestnodes.push(newnode);
  if(Rete.debug) console.log(`build_or_share_intra_test_node newconsttestnode: %${newnode}\n`);
  parent.children.push(newnode);
  // newnode->field_to_test = f; newnode->field_must_equal = sym;
  // newnode->output_memory = nullptr;
  // newnode->children = nullptr;
  return newnode;
}

function build_intra_arith_test_node(
  r: Rete,
  parent: TestNode,
  arithTest: ConditionArithTest,
  c: Condition,
): ArithTestNode {
  const newnode = arithTest.compileFromConditions(c, []);
  if(Rete.debug) console.log(`build_intra_arith_test_node newnode: %${newnode}\n`);
  newnode.parent = parent;
  parent.children.push(newnode);
  return newnode;
}


// implied in page 35: build_or_share_alpha_memory.
function wme_passes_constant_tests(w: WME, c: Condition) {
  for(let f = 0; f < WMEFieldType.NumFields; ++f) {
    if (c.attrs[f].type != FieldType.Const) continue;
    if (c.attrs[f].v != w.fields[f]) return false;
  }
  return true;
}

export interface FuzzySystem {
  computeConjunction(...μs: number[]): number;
  computeDisjunction(...μs: number[]): number;
}

export interface FuzzyVariable {
  getName(): string;
  isFuzzyValue(fuzzyValue: string): boolean;
  computeMembershipValueForFuzzyValue(fuzzyValue: string, val: number): number;
  computeValueForFuzzyMembershipValue(fuzzyValue: string, μ: number): number;
}

function build_or_share_fuzzy_test_node(r: Rete, parent: TestNode, fuzzyVariable: string, fuzzyValue: string) {
  strict.strict(parent != null, 'Parent cannot be null');
  // look for pre-existing node
  for (const child of parent.children) {
    if (child instanceof FuzzyTestNode) {
      if (child.fuzzyValue == fuzzyVariable && child.fuzzyValue == fuzzyValue) {
        return child;
      }
    }
  }
  // build a new node
  const newnode = new FuzzyTestNode(r.getFuzzySystem(fuzzyVariable), fuzzyVariable, fuzzyValue, null, parent);
  r.consttestnodes.push(newnode);
  if(Rete.debug) console.log(`build_fuzzy_test_node_if_needed fuzzytestnode: %${newnode}\n`);
  parent.children.push(newnode);
  return newnode;
}

// page 36: hash version for const test nodes, integrated with: pg 35: dataflow version for other nodes
export function build_or_share_alpha_memory_dataflow(r: Rete, c: Condition) { //exported for tests
  let currentNode = r.alpha_top;
  const attr = c.attrs[WMEFieldType.Attr];
  const val = c.attrs[WMEFieldType.Val];
  if(attr.type === FieldType.Const && val.type === FieldType.Const && r.isFuzzyDomainVariable(attr.v, val.v)) {
    currentNode = build_or_share_fuzzy_test_node(r, currentNode, attr.v, val.v);
  } else {
    for (let f = 0; f < WMEFieldType.NumFields; ++f) {
      const sym = c.attrs[f].v;
      if (c.attrs[f].type == FieldType.Const) {
        currentNode = build_or_share_constant_test_node(r, currentNode, f, sym);
      } else {
        for (let f2 = f + 1; f2 < WMEFieldType.NumFields; ++f2) {
          if (c.attrs[f2].type == FieldType.Var && sym === c.attrs[f2].v) {
            currentNode = build_or_share_intra_test_node(r, currentNode, f, f2);
          }
        }
      }
    }
    for (const arithTest of c.intraArithTests) {
      currentNode = build_intra_arith_test_node(r, currentNode, arithTest, c);
    }
  }

  if (currentNode.output_memory != null) {
    return currentNode.output_memory;
  }
  strict.strict(currentNode.output_memory == null, 'Output memory cannot be null');
  currentNode.output_memory = new AlphaMemory(currentNode);
  r.alphamemories.push(currentNode.output_memory);
  // initialize AM with any current WMEs
  for (const w of r.working_memory) {
    // check if wme passes all constant tests
    if (wme_passes_constant_tests(w, c)) {
      alpha_memory_activation(currentNode.output_memory, w, true);
    }
  }
  return currentNode.output_memory;
}

const dummyWME = new WME('#dummy', '#dummy', '#dummy');

// pg 37
function build_networks_for_conditions(lhs: GenericCondition[], r: Rete, earlierConds: GenericCondition[], j: JoinNode | null = null) {
  let tests: AbstractTestAtJoinNode[];
  let am: AlphaMemory;
  let currentBeta: BetaMemory | null = null;
  let currentJoin: JoinNode | null = j;

  for (let i = 0; i < lhs.length; ++i) {
    let cond = lhs[i];
    if(cond instanceof NegativeCondition) {
      strict.strict(currentJoin, 'Current join should exist');
      const branchConds = [...earlierConds];
      const j: JoinNode = build_networks_for_conditions(cond.negativeConditions, r, branchConds, currentJoin);
      const nccPartnerNode = new NccPartnerNode(j, cond.negativeConditions.length);
      j.children.push(nccPartnerNode);
      const nccNode = new NccNode(currentJoin!, nccPartnerNode);
      currentJoin!.children = [nccNode, ...currentJoin!.children]; //Always first
      if(Rete.debug) console.log(`added ncc partner node: %${nccPartnerNode}`);
      if(Rete.debug) console.log(`added ncc node: %${nccNode}`);

      //Continue underneath
      currentBeta = nccNode;
      const dummyAlphaMemory = new AlphaMemory(new NeverTestNode());
      dummyAlphaMemory.items = [dummyWME];
      currentJoin = new JoinNode(dummyAlphaMemory, nccNode);
      nccNode.children.push(currentJoin)
      r.joinnodes.push(currentJoin);
      update_new_node_with_matches_from_above(nccNode);
      update_new_node_with_matches_from_above(nccPartnerNode);
    } else if(cond instanceof AggregateCondition) {
      const branchConds = [...earlierConds];
      const j: JoinNode = build_networks_for_conditions(cond.innerConditions, r, branchConds, currentJoin);
      const dummyAlphaMemory = new AlphaMemory(new NeverTestNode());
      const aggregateComputation = cond.aggregateComputation;
      const allConditionsForAggregate = [...earlierConds, ...cond.innerConditions];
      const locationInToken = getLocationsOfVariablesInConditions(aggregateComputation.variables(), allConditionsForAggregate);
      aggregateComputation.locationInToken = locationInToken;
      const aggregateNode = new AggregateNode(j, cond.innerConditions.length, aggregateComputation, dummyAlphaMemory);
      j.children.push(aggregateNode);
      const betaMemory = new BetaMemory(currentJoin!);
      currentJoin!.children = [betaMemory, ...currentJoin!.children]; //Always first
      if(Rete.debug) console.log(`added aggregate node: %${aggregateNode}`);

      if(Rete.debug) console.log(`added β-memory for aggregate node: %${betaMemory}`);
      //Continue underneath
      currentBeta = betaMemory;
      currentJoin = new JoinNode(dummyAlphaMemory, betaMemory);
      currentJoin.tests.push(new TokenTest());
      dummyAlphaMemory.successors = [currentJoin];
      betaMemory.children.push(currentJoin)
      r.joinnodes.push(currentJoin);
      update_new_node_with_matches_from_above(betaMemory);
      update_new_node_with_matches_from_above(aggregateNode);
    } else if(cond instanceof PositiveCondition) {
      const branchConds = [...earlierConds];
      const j: JoinNode = build_networks_for_conditions(cond.positiveConditions, r, branchConds, currentJoin);
      const dummyAlphaMemory = new AlphaMemory(new NeverTestNode());
      const aggregateComputation = new AggregateExist();
      const allConditionsForAggregate = [...earlierConds, ...cond.positiveConditions];
      const locationInToken = getLocationsOfVariablesInConditions(aggregateComputation.variables(), allConditionsForAggregate);
      aggregateComputation.locationInToken = locationInToken;
      const aggregateNode = new AggregateNode(j, cond.positiveConditions.length, aggregateComputation, dummyAlphaMemory);
      j.children.push(aggregateNode);
      const betaMemory = new BetaMemory(currentJoin!);
      currentJoin!.children = [betaMemory, ...currentJoin!.children]; //Always first
      if(Rete.debug) console.log(`added aggregate node for positive condition: %${aggregateNode}`);

      if(Rete.debug) console.log(`added β-memory for aggregate node for positive condition: %${betaMemory}`);
      //Continue underneath
      currentBeta = betaMemory;
      currentJoin = new JoinNode(dummyAlphaMemory, betaMemory);
      currentJoin.tests.push(new TokenTest());
      currentJoin.tests.push(new ExistTest());
      dummyAlphaMemory.successors = [currentJoin];
      betaMemory.children.push(currentJoin)
      r.joinnodes.push(currentJoin);
      update_new_node_with_matches_from_above(betaMemory);
      update_new_node_with_matches_from_above(aggregateNode);
    } else {
      // get the join node J[i] for condition c[u[
      tests = get_join_tests_from_condition(r, cond, earlierConds);
      am = build_or_share_alpha_memory_dataflow(r, cond);
      if (i > 0 || j) { // get the current beta memory node M[i]
        currentBeta = build_or_share_beta_memory_node(r, currentJoin!);
      }
      currentJoin = build_or_share_join_node(r, currentBeta, am, tests);
    }
    earlierConds.push(cond);
  }
  return currentJoin!;
}

// - inferred type of production node:
function add_production(r: Rete, lhs: GenericCondition[], rhs: string) {
  // pseudocode: pg 33
  // M[1] <- dummy-top-node
  // build/share J[1] (a child of M[1]), the join node for c[1]
  // for i = 2 to k do
  //     build/share M[i] (a child of J[i-1]), a beta memory node
  //     build/share J[i] (a child of M[i]), the join node for ci
  // make P (a child of J[k]), the production node
  let earlierConds: Condition[] = [];
  let currentJoin = build_networks_for_conditions(lhs, r, earlierConds);
  const locationsOfAllVariablesInConditions = getLocationsOfAllVariablesInConditions(lhs);

  // build a new production node, make it a child of current node
  const prod = new ProductionNode(currentJoin!, rhs, locationsOfAllVariablesInConditions);
  r.productions.push(prod);
  if(Rete.debug) console.log(`add_production prod: %${prod} | parent: %${prod.parent}\n`);
  currentJoin.children.push(prod);
  // update new-node-with-matches-from-above (the new production node)
  update_new_node_with_matches_from_above(prod);
  return prod;
}

export type LocationsOfVariablesInConditions = { [key: string]: number[] };

export function getLocationsOfVariablesInConditions(variables: string[], conds: GenericCondition[]): LocationsOfVariablesInConditions {
  const locationInToken: LocationsOfVariablesInConditions = {};
  for (const v of variables) {
    const [i, f2] = lookup_earlier_cond_with_field(conds, v);
    if (i == -1)  {
      strict.strict(f2 == -1, 'Field position found but variable was not found');
    }
    strict.strict(i != -1, 'Variable not found');
    strict.strict(f2 != -1, 'Variable not found');
    locationInToken[v] = [i, f2];
  }
  return locationInToken;
}

export function getLocationsOfAllVariablesInConditions(conds: GenericCondition[]): LocationsOfVariablesInConditions {
  const locationInToken: LocationsOfVariablesInConditions = {};
  for (let i = 0; i < conds.length; i++){
    const cond = conds[i];
    if(!(cond instanceof Condition)) continue;
    //todo see if wholeWmeVars will be included
    for (let j = 0; j < WMEFieldType.NumFields; ++j) {
      if (cond.attrs[j].type != FieldType.Var) continue;
      if (!(cond.attrs[j].v in locationInToken)) {
        locationInToken[cond.attrs[j].v] = [i, j];
      }
    }
  }
  return locationInToken;
}

export function evalVariablesInToken(variables: string[], locationInToken: LocationsOfVariablesInConditions, token: Token): StringToStringMap {
  const retItem: StringToStringMap = {};
  for (const v of variables) {
    const loc = locationInToken[v];
    retItem[v] = token.index(loc[0]).get_field(loc[1]);
  }
  return retItem;
}

function query(r: Rete, conds: GenericCondition[], variables: string[]): StringToStringMap[] {
  const locationInToken = getLocationsOfVariablesInConditions(variables, conds);
  const p = add_production(r, conds, "p" + Math.random());
  const [toAdd, toRemove] = p.willFire();
  r.removeProduction(p);
  const ret: StringToStringMap[] = [];
  for (const token of toAdd) {
    const retItem = evalVariablesInToken(variables, locationInToken, token);
    ret.push(retItem);
  }
  return ret;
}

function remove_test_node(r: Rete, t: TestNode) {
  if(!t.parent) {
    console.error('Cannot remove test node:', t.toString());
    return;
  }
  if (t.parent.parent) {
    t.parent.parent.children = t.parent.parent.children.filter(x => x !== t.parent);
  }
  r.consttestnodes = r.consttestnodes.filter(x => x !== t);
}

function remove_alpha_memory(r: Rete, a: AlphaMemory) {
  if(a.successors.length) {
    console.error('Cannot remove α-memory:', a.toString());
    return;
  }
  remove_test_node(r, a.parent);
  r.alphamemories = r.alphamemories.filter(x => x !== a);
}

function remove_join_node(r: Rete, j: JoinNode) {
  if(j.children.length) {
    console.error('Cannot remove join node:', j.toString());
    return;
  }
  j.amem_src.successors = j.amem_src.successors.filter(x => x !== j);
  if(j.amem_src.successors.length === 0) {
    remove_alpha_memory(r, j.amem_src);
  }
  if (j.bmem_src) {
    j.bmem_src.children = j.bmem_src.children.filter(x => x !== j);
    if (j.bmem_src.children.length === 0) {
      remove_beta_memory(r, j.bmem_src);
    }
  }
  r.joinnodes = r.joinnodes.filter(x => x !== j);
}

function remove_beta_memory(r: Rete, betaMemory: BetaMemory) {
  if(betaMemory.children.length) {
    console.error('Cannot remove β-memory:', betaMemory.toString());
    return;
  }
  betaMemory.parent.children =betaMemory.parent.children.filter(x => x !== betaMemory);
  if(betaMemory.parent.children.length === 0 && betaMemory.children.length === 0) {
    remove_join_node(r, betaMemory.parent);
  }
  if(betaMemory instanceof NccNode) {
    remove_beta_memory(r, betaMemory.nccPartnerNode);
  }
  if (betaMemory instanceof ProductionNode) {
    r.productions = r.productions.filter(x => x !== betaMemory);
  } else {
    r.betamemories = r.betamemories.filter(x => x !== betaMemory);
  }
}

function remove_production(r: Rete, p: ProductionNode) {
  remove_beta_memory(r, p);
}
