import {expect} from "chai";
import {spy} from 'sinon';
import {build_or_share_alpha_memory_dataflow, Condition, Field, Rete} from "../index";

describe('The Rete', ()=> {
  it('can create an α-network that avoids non-pertinent tests', ()=>{
    const rete = new Rete();
    const condition1 = new Condition(Field.var('x'), Field.constant('attr1'), Field.var('y'));
    build_or_share_alpha_memory_dataflow(rete, condition1)
    const condition2 = new Condition(Field.var('x'), Field.constant('attr2'), Field.var('y'));
    build_or_share_alpha_memory_dataflow(rete, condition2)
    expect(rete.alphamemories.length).to.equal(2);
    const sinonSpyTestWme1 = spy(rete.alpha_top.hashtable[1]['attr1'][0], 'testWme');
    const sinonSpyTestWme2 = spy(rete.alpha_top.hashtable[1]['attr2'][0], 'testWme');
    rete.add('a', 'attr_none', 'b');
    expect(sinonSpyTestWme1.callCount).to.equal(0);
    expect(sinonSpyTestWme2.callCount).to.equal(0);
    rete.add('a', 'attr1', 'b');
    expect(sinonSpyTestWme1.callCount).to.equal(1);
    expect(sinonSpyTestWme2.callCount).to.equal(0);
    rete.add('a', 'attr2', 'b');
    expect(sinonSpyTestWme1.callCount).to.equal(1);
    expect(sinonSpyTestWme2.callCount).to.equal(1);
    expect(rete.alphamemories[0].items.length).to.equal(1);
    expect(rete.alphamemories[1].items.length).to.equal(1);
  });
});
