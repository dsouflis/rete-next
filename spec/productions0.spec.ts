import {expect} from 'chai';
import {describe} from "mocha";
import {parseRete, ParseSuccess} from '../productions0';
import {Condition, Field, NegativeCondition, Rete, WME} from "../index";

describe('The Productions0 parser', () => {
  it('can parse the whole of the grammar', () => {
    const input = `( (<x> on <y>) (<y> > (3 + <x>)) -{ (<y> left-of <z>)} (<w> = #sum(<w> * 2)) from {(<y> on <w>)} -> "prod 1")`;
    const reteParse = parseRete(input);
    console.log(reteParse);
    expect('specs' in reteParse && reteParse.specs).to.exist;
  });

  it('can parse productions with simple conditions and add them to a Rete', () => {
    console.log('====can parse productions with simple conditions and add them to a Rete===');
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

  it('can parse productions with simple conditions and constraints, and add them to a Rete', () => {
    console.log('====can parse productions with simple conditions and constraints, and add them to a Rete===');
    const input = `( (<x> weight <y>) (<y> < 50) -> "prod1")`;
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

    rete.add("B1", "weight", "40");
    expect(p!!.items.length).to.equal(1);

    rete.add("B2", "weight", "50");
    expect(p!!.items.length).to.equal(1);

    console.log("====\n");
  });

  it('can parse productions with negative conditions, and add them to a Rete', () => {
    console.log("====parse productions with negative conditions, and add them to a Rete:====\n");
    const input = `( (<x> on <y>) -{(<z> on <x>)} -> "prod1")`;
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

    const w1 = new WME("B1", "on", "B2");
    console.log('Adding ' + w1);
    rete.addWME(w1);
    expect(p!!.items.length).to.equal(1);
    expect(p!!.items[0].parent?.parent).to.be.null;
    expect(p!!.items[0].wme.fields[0]).to.equal('#dummy');
    expect(p!!.items[0].parent?.wme.fields[0]).to.equal('B1');
    expect(p!!.items[0].parent?.wme.fields[1]).to.equal('on');
    expect(p!!.items[0].parent?.wme.fields[2]).to.equal('B2');

    const w2 = new WME("B3", "on", "B1");
    console.log('Adding ' + w2);
    rete.addWME(w2);
    expect(p!!.items.length).to.equal(1);
    expect(p!!.items[0].parent?.parent).to.be.null;
    expect(p!!.items[0].wme.fields[0]).to.equal('#dummy');
    expect(p!!.items[0].parent?.wme.fields[0]).to.equal('B3');
    expect(p!!.items[0].parent?.wme.fields[1]).to.equal('on');
    expect(p!!.items[0].parent?.wme.fields[2]).to.equal('B1');

    console.log('Deleting ' + w2);
    rete.removeWME(w2);
    expect(p!!.items.length).to.equal(1);
    expect(p!!.items[0].parent?.parent).to.be.null;
    expect(p!!.items[0].wme.fields[0]).to.equal('#dummy');
    expect(p!!.items[0].parent?.wme.fields[0]).to.equal('B1');
    expect(p!!.items[0].parent?.wme.fields[1]).to.equal('on');
    expect(p!!.items[0].parent?.wme.fields[2]).to.equal('B2');

    console.log("====\n");
  })
});
