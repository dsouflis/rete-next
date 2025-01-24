import {build_or_share_alpha_memory_dataflow, Condition, Field, Rete} from "../index";
import {expect} from "chai";

describe('The Rete', ()=> {
  it('can create an σ-network', ()=>{
    const rete = new Rete();
    const condition1 = new Condition(Field.var('x'), Field.constant('attr1'), Field.var('y'));
    build_or_share_alpha_memory_dataflow(rete, condition1)
    const condition2 = new Condition(Field.var('x'), Field.constant('attr2'), Field.var('y'));
    build_or_share_alpha_memory_dataflow(rete, condition2)
    expect(rete.alphamemories.length).to.equal(2);
    rete.add('a', 'attr_none', 'b');
    rete.add('a', 'attr1', 'b');
    rete.add('a', 'attr2', 'b');
    expect(rete.alphamemories[0].items.length).to.equal(1);
    expect(rete.alphamemories[1].items.length).to.equal(1);
  });
});
