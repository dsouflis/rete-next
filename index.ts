import { strict as assert } from 'assert';

// Production Matching for Large Learning Systems
// http://reports-archive.adm.cs.cmu.edu/anon/1995/CMU-CS-95-113.pdf
// WM: working memory - current situation of the system
//  - WME: working memory element
// eg. block world:
// w1: (B1 ^on B2)
// w2: (B1 ^on B3)
// w3: (B1 ^color red)
// w4: (B2 ^on table)
// w5: (B2 ^left-of B3)
// w6: (B2 ^color blue)
// w7: (B3 ^left-of B4)
// w8: (B3 ^on table)
// w9: (B3 ^color red)
// wn: (id ^attr val)


// production can contain varibles, in angle brackets: <x>
// (find-stack-of-two-blocks-to-the-left-of-a-red-block
// (<x> ^on <y>) (<y> ^left-of <z>) (<z> ^color red) --> ... RHS ... )
// eg. C1: (<x> ^on <y>)
//     C2: (<y> ^left-of <z>)
//     C3: (<z> %color red)


// A production can match with the current WM if all the conditions match
// with intems in WM, with variables bound consistently.
// Create dataflow network for conditions.
// alpha memory (AM): current set of working memory that pass *all* tests of a condition
//   eg. AM for [C1: (<x> ^on <y>)] contains (w1, w2, w4, w8), since they have (_ ^on _).
//       AM for [C2: (<y> ^left-of <z>)] contains (w5, w7)


// beta memory: join nodes, beta memories.
// join nodes perform consistency checks _between_ conditions.
// beta memory stores partial instantiation of production: combinations of WMEs which
//   match some but not all conditions of a production.

// alpha network also performs _intra-condition_ consistency tests: eg: (<x> ^on <x>)
// Tests can be any bolean operation.


// current working memory: relation / table(?)
// production: query
// constant test: SELECT
// If a production has c1, c2, ... cn,
//    the beta nodes perform _intermediate_ JOINS c1 x c2 .. x ck for k < n

// the SELECT and JOINs are updated whenever the working memory (table)
// is updated.
// working memory -> alpha network -> beta network.
// activation of node from a node in the beta network is called LEFT ACTIVATION
// activation of node from a node in the alpha network is called RIGHT ACTIVATION

// So a beta join node can have 2 types of activations:
//    - right activation | WME is added to the alpha memory that feeds the join node
//    - left activation  | a token is added into beta memory by a parent.

// Why is Rete fast?
// 1. state-saving: after each change to WM, alpha and beta memory states are saved
// 2. sharing of nodes: sharing can occur in the alpha network if multiple productions
//    have the same condition. Sharing can occur in beta network if two productions
//    have similar first few conditions.

// data WME id attr val = WME id attr val deriving(Eq, Ord)
// brackets :: [String] -> String; brackets s = "("<>List.intercalate " " s<>")"
// instance (Show id, Show attr, Show val) => Show (WME id attr val) where
//   show (WME a b c) = brackets [show a, "^" <> show b, show c]
//
// -- PM: production memory
// data Production cond act = Production cond act deriving (Eq, Ord)
// instance (Show cond, Show act) => Show (Production cond act) where
//   show (Production cond act) = brackets [show cond, "-->", show act]

enum WMEFieldType {
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
    fields: string[] = ['','',''];
    get_field(ty: WMEFieldType) : string {
        return this.fields[ty];
    }

    constructor(id: string, attr: string, val: string) {
        this.fields[WMEFieldType.Ident] = id;
        this.fields[WMEFieldType.Attr] = attr;
        this.fields[WMEFieldType.Val] = val;
    }

    toString() {
      let s = "(";
      for(let f = 0; f < WMEFieldType.NumFields; ++f) {
          s += this.fields[f];
          if (f < WMEFieldType.NumFields - 1) s += " ";
      }
      s += ")";
      return s;
    }
}

// pg 21
class AlphaMemory {
  items: WME[] = []
  successors: JoinNode[] = [];

  toString() {
    let s: string = "(alpha-memory:" + this.items.length + " ";
    for (const wme of this.items) s += wme + " ";
    s += ")";
    return s;
  }
}

// pg 14
export abstract class TestNode { //ds: Exported to facilitate unit tests
  output_memory: AlphaMemory | null;
  children: TestNode[] = [];

  constructor(
    output_memory: AlphaMemory | null
  ) {
    this.output_memory = (output_memory);
  }

  abstract toString(): string;

  abstract testWme(w: WME) : boolean;
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

export class ConstTestNode extends TestNode  {
  field_to_test: WMEFieldType;
  field_must_equal: string;

  constructor(
    field_to_test: WMEFieldType,
    field_must_equal: string,
    output_memory: AlphaMemory | null
  ) {
    super(output_memory);
    this.field_to_test = field_to_test;
    this.field_must_equal = field_must_equal;
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

  constructor(first_field: WMEFieldType, second_field: WMEFieldType, output_memory: AlphaMemory | null) {
    super(output_memory);
    this.first_field = first_field;
    this.second_field = second_field;
  }

  testWme(w: WME): boolean {
    return w.fields[this.first_field] === w.fields[this.second_field];
  }

  toString() {
    return "(const-test " + printFieldType(this.first_field) + " == " + this.second_field + ")";
  }
}

// pg 22
class Token {
  parent: Token | null; // items [0..i-1]
  token_chain_ix: number;
  wme: WME; // item i

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
    if (!((ix >= 0) && (ix < this.token_chain_ix))) {
      console.error("ix: " + ix + " token_chain_ix: " + this.token_chain_ix + " wme: " + this.wme + "\n");
    }
    assert.strict(ix >= 0);
    assert.strict(ix <= this.token_chain_ix);
    if (ix == this.token_chain_ix) {
      return this.wme;
    }
    assert.strict(this.parent !== null);
    return this.parent!.index(ix);
  }

  toString() {
    let s = "(";
    for(let p: Token | null = this; p !== null; p = p.parent) {
      assert.strict(p.wme);
      s += (p.wme);
      if (p.parent !== null) { s += "->";}
    }
    s += ")";
    return s;
  }
}

// pg 22
class BetaMemory {
  parent: JoinNode; // invariant: must be valid.
  items: Token[] = [];
  children: JoinNode[] = [];

  constructor(parent: JoinNode) {
    this.parent = parent;
  }

  // pg 23: dodgy! the types are different from BetaMemory and their children
  // updates
  join_activation(t: Token | null, w: WME) {
    const new_token = new Token(w, t);
    this.items = [new_token, ...this.items];
    for (let child of this.children) {
      child.beta_activation(t);
    }
  }

  toString() {
    let s  = "(beta-memory items:";
    for(let item of this.items) {
      s += item + ' ';
    }
    s += "| " + this.children.length + " children";
    s += ")";
    return s;
  }
}

// pg 24
class TestAtJoinNode {
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

  toString() {
    let s  = "(test-at-join ";
    s += this.field_of_arg1 + " ==  " +
      this.ix_in_token_of_arg2 + "[" + this.field_of_arg2  + "]";
    s += ")";
    return s;
  }
}


/// pg 24
class JoinNode {
  amem_src: AlphaMemory;
  bmem_src: BetaMemory | null;

  children: BetaMemory[] = [];
  tests: TestAtJoinNode[] = [];

  constructor(amem_src: AlphaMemory, bmem_src: BetaMemory | null) {
    this.amem_src = amem_src;
    this.bmem_src = bmem_src;
  }

  alpha_activation(w: WME) {
    assert.strict(this.amem_src);
    if (this.bmem_src) {
      for (const t of this.bmem_src.items) {
        if (!this.perform_join_tests(t, w)) continue;
        for (const child of this.children) child.join_activation(t, w);
      }
    } else {
      for (const child of this.children) {
        child.join_activation(null, w);
      }
    }
  }

  beta_activation(t: Token | null) {
    assert.strict(this.amem_src);
    for (const w of this.amem_src.items) {
      if (!this.perform_join_tests(t, w)) continue;
      for (const child of this.children) child.join_activation(t, w);
    }
  }

  perform_join_tests(t: Token | null, w: WME) {
    if (!this.bmem_src) return true;
    assert.strict(this.amem_src);

    if (t) {
      for (const test of this.tests) {
        const arg1 = w.get_field(test.field_of_arg1);
        const wme2 = t.index(test.ix_in_token_of_arg2);
        const arg2 = wme2.get_field(test.field_of_arg2);
        if (arg1 != arg2) return false;
      }
    }
    return true;
  }

  toString() {
    let s = "(join";
    for (const test of this.tests) {
      s += test;
    }
    s += ")";
    return s;
  }
}

// pg 37: inferred
class ProductionNode extends BetaMemory {
  rhs: string;

  constructor(parent: JoinNode, rhs: string) {
    super(parent);
    this.rhs = rhs;
  }

  join_activation(t: Token, w: WME) {
    t = new Token(w, t);
    this.items.push(t);
    console.log("## (PROD " + t + " ~ " + this.rhs + ") ##\n");
  }

  toString() {
    return "(production " + this.rhs + ")";
  }
}

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

  constructor() {
    this.alpha_top = new DummyTestNode();
    this.consttestnodes.push(this.alpha_top);
  }
}

// pg 21
function alpha_memory_activation(node: AlphaMemory, w: WME) {
  node.items = [(w), ...node.items];
  console.log("alpha_memory_activation" + "| node: " + node + " | wme: " + w + "\n");
  for (const child of node.successors) child.alpha_activation(w);

}

// pg 15
// return whether test succeeded or not.
function const_test_node_activation(node: TestNode, w: WME) {
  console.log ("const_test_node_activation" + "| node: " + node + " | wme: " + w + "\n");
  if (!node.testWme(w)) {
    return false;
  }
  if (node.output_memory) {
    alpha_memory_activation(node.output_memory, w);
  }
  for (const c of node.children) {
    const_test_node_activation(c, w);
  }
  return true;
}

// pg 14
export function addWME(r: Rete, w: WME) {
  r.working_memory.push(w);
  const_test_node_activation(r.alpha_top, w);
}


// pg 38
function update_new_node_with_matches_from_above(beta: BetaMemory) {
  const join = beta.parent;
  const savedListOfChildren = join.children;
  // WTF?
  join.children = [ beta ];

  // push alpha memory through join node.
  for(const item of join.amem_src.items) { join.alpha_activation(item); }
  join.children = savedListOfChildren;
}

// pg 34
function build_or_share_beta_memory_node(r: Rete, parent: JoinNode) {
  if (parent.children.length) { return parent.children[0]; }

  const newbeta = new BetaMemory(parent);
  r.betamemories.push(newbeta);
  console.log(`build_or_share_beta_memory_node newBeta: %${newbeta} | parent: %${newbeta.parent}\n`);
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
  tests: TestAtJoinNode[]
) {
  // bmem can be nullptr in top node case.
  // assert(bmem != nullptr);
  assert.strict(amem !== null);

  const newjoin = new JoinNode(amem, bmem);
  r.joinnodes.push(newjoin);
  newjoin.tests = tests;
  amem.successors=[(newjoin), ...amem.successors];
  if (bmem ) { bmem.children.push(newjoin); }
  return newjoin;
}

// inferred from discussion
enum FieldType {
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
}

// inferred from discussion
export class Condition {
  attrs: Field[];

  constructor(ident: Field, attr: Field, val: Field) {
    this.attrs = [ident, attr, val];
  }
}

// implicitly defined on pg 35
function lookup_earlier_cond_with_field(
  earlierConds: Condition[],
  v: string,
) {
  let i: number = earlierConds.length - 1;
  let f2: number = -1;

  for(let it = 0; it != earlierConds.length; ++it) {
    const cond: Condition = earlierConds[it];
    for (let j = 0; j < WMEFieldType.NumFields; ++j) {
      if (cond.attrs[j].type != FieldType.Var) continue;
      if (cond.attrs[j].v == v) {
        f2 = j;
        return [i,f2];
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
  earlierConds: Condition[]
) {
  const result: TestAtJoinNode[] = [];

  for(let f = 0; f < WMEFieldType.NumFields; ++f) {
    if (c.attrs[f].type != FieldType.Var) continue;
    // each occurence of variable v
    const v = c.attrs[f].v;
    const [i, f2] = lookup_earlier_cond_with_field(earlierConds, v);
    // nothing found
    if (i == -1)  { assert.strict(f2 == -1); continue; }
    assert.strict(i != -1); assert.strict(f2 != -1);
    const test = new TestAtJoinNode(f, f2, i);
    result.push(test);
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
  assert.strict(parent != null);
  // look for pre-existing node
  for (const child of parent.children) {
    if(child instanceof ConstTestNode) {
      if (child.field_to_test == f && child.field_must_equal == sym) {
        return child;
      }
    }
  }
  // build a new node
  const newnode = new ConstTestNode(f, sym, null);;
  r.consttestnodes.push(newnode);
  console.log(`build_or_share_constant_test_node newconsttestnode: %${newnode}\n`);
  parent.children.push(newnode);
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
  assert.strict(parent != null);
  // look for pre-existing node
  for (const child of parent.children) {
    if(child instanceof IntraTestNode) {
      if (child.first_field == f1 && child.second_field == f2) {
        return child;
      }
    }
  }
  // build a new node
  const newnode = new IntraTestNode(f1, f2, null);;
  r.consttestnodes.push(newnode);
  console.log(`build_or_share_intra_test_node newconsttestnode: %${newnode}\n`);
  parent.children.push(newnode);
  // newnode->field_to_test = f; newnode->field_must_equal = sym;
  // newnode->output_memory = nullptr;
  // newnode->children = nullptr;
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

// pg 35: dataflow version
function build_or_share_alpha_memory_dataflow(r: Rete, c: Condition) {
  let currentNode = r.alpha_top;
  for (let f = 0; f < WMEFieldType.NumFields; ++f) {
    const sym = c.attrs[f].v;
    if (c.attrs[f].type == FieldType.Const) {
      currentNode = build_or_share_constant_test_node(r, currentNode, f, sym);
    } else {
      for(let f2 = f + 1; f2 < WMEFieldType.NumFields; ++f2) {
        if(c.attrs[f2].type == FieldType.Var && sym === c.attrs[f2].v) {
          currentNode = build_or_share_intra_test_node(r, currentNode, f, f2);
        }
      }
    }
  }

  if (currentNode.output_memory != null) {
    return currentNode.output_memory;
  }
  assert.strict(currentNode.output_memory == null);
  currentNode.output_memory = new AlphaMemory();
  r.alphamemories.push(currentNode.output_memory);
  // initialize AM with any current WMEs
  for (const w of r.working_memory) {
    // check if wme passes all constant tests
    if (wme_passes_constant_tests(w, c)) {
      alpha_memory_activation(currentNode.output_memory, w);
    }
  }
  return currentNode.output_memory;
}

// page 36: hash version
function build_or_share_alpha_memory_hashed(r: Rete, c: Condition) {
  assert.strict(false && "unimplemented");
}


// pg 37
// - inferred type of production node:
export function add_production(r: Rete, lhs: Condition[], rhs: string) {
  // pseudocode: pg 33
  // M[1] <- dummy-top-node
  // build/share J[1] (a child of M[1]), the join node for c[1]
  // for i = 2 to k do
  //     build/share M[i] (a child of J[i-1]), a beta memory node
  //     build/share J[i] (a child of M[i]), the join node for ci
  // make P (a child of J[k]), the production node
  let earlierConds: Condition[] = [];

  let tests =
    get_join_tests_from_condition(r, lhs[0], earlierConds);
  let am = build_or_share_alpha_memory_dataflow(r, lhs[0]);

  let currentBeta: BetaMemory | null = null;
  let currentJoin = build_or_share_join_node(r, currentBeta, am, tests);
  earlierConds.push(lhs[0]);

  for(let i = 1; i < lhs.length; ++i) {
    // get the current beat memory node M[i]
    currentBeta = build_or_share_beta_memory_node(r, currentJoin);
    // get the join node J[i] for condition c[u[
    tests = get_join_tests_from_condition(r, lhs[i], earlierConds);
    am = build_or_share_alpha_memory_dataflow(r, lhs[i]);
    currentJoin = build_or_share_join_node(r, currentBeta, am, tests);
    earlierConds.push(lhs[i]);
  }

  // build a new production node, make it a child of current node
  const prod = new ProductionNode(currentJoin, rhs);
  r.productions.push(prod);
  console.log(`add_production prod: %${prod} | parent: %${prod.parent}\n`);
  currentJoin.children.push(prod);
  // update new-node-with-matches-from-above (the new production node)
  update_new_node_with_matches_from_above(prod);
  return prod;
}
