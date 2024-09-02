import {expect} from 'chai';
import {describe} from "mocha";
import {parseRete, ParseSuccess} from '../productions0';
import {Rete} from "../index";

describe('The Productions0 parser', () => {
  it('can parse the whole of the grammar', () => {
    const input = `( (<x> on <y>) (<y> > (3 + <x>)) -{ (<y> left-of <z>)} (<w> = #sum(<w> * 2)) from {(<y> on <w>)} -> "prod 1")`;
    const reteParse = parseRete(input);
    console.log(reteParse);
    expect('specs' in reteParse && reteParse.specs).to.exist;
  });

  it('can parse productions and add them to a Rete', () => {
    console.log('====can parse productions and add them to a Rete===');
    const input = `( (<x> on <y>) -> "prod1")`;
    const reteParse = parseRete(input);
    console.log(reteParse);
    expect('specs' in reteParse && reteParse.specs).to.exist;

    console.log("adding production\n");
    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;

    for (const {lhs, rhs} of parsed.specs) {
      rete.addProduction(lhs, rhs);
    }

    const p = rete.productions.find(p => p.rhs === "prod1");

    expect(p).to.exist;

    console.log("added production\n");

    rete.add("B1", "on", "B2");
    expect(p!!.items.length).to.equal(1);

    rete.add("B1", "on", "B3");
    expect(p!!.items.length).to.equal(2);

    console.log("====\n");
  });
});
