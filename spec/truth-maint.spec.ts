import {expect} from 'chai';
import {
  Condition,
  ConditionArithConst,
  ConditionArithTest,
  ConditionArithVar,
  ConditionSymbolicConst,
  ConstTestNode,
  Field, FuzzySystem,
  FuzzyVariable,
  FuzzyWME,
  NegativeCondition,
  Rete,
  Token,
  WME,
} from '../index.js';
import exp from "node:constants";

describe('A user of the library', () => {
  it('can automatically undo productions', () => {
    console.log("====automatically undo productions:====\n");
    const rete = new Rete();


    console.log("adding production\n");

    let lhs1 = [
      new Condition(
        Field.var("x"),
        Field.constant("touch"),
        Field.constant("table1")),
      new NegativeCondition([
        new Condition(
          Field.var("z"),
          Field.constant("on"),
          Field.var("x")),
      ])
    ];
    const p1 = rete.addProduction(lhs1, "prod1");

    let lhs2 = [
      new Condition(
        Field.var("x"),
        Field.constant("touch"),
        Field.constant("table2")),
      new NegativeCondition([
        new Condition(
          Field.var("z"),
          Field.constant("on"),
          Field.var("x")),
      ])
    ];
    const p2 = rete.addProduction(lhs2, "prod2");

    console.log("added productions\n");

    const w1a = new WME("B1", "touch", "table1");
    console.log('Adding ' + w1a);
    rete.addWME(w1a);
    const [toAdd1, toRemove1] = p1.willFire();
    expect(toAdd1.length).to.equal(1);

    const addedWme = new WME('B1', 'is', 'candidate');
    type Justification = { token:Token, prod: string };
    let justifications: { wme: WME, justifications: Justification[]}[] = [];
    justifications.push({ wme: addedWme, justifications: [{token: toAdd1[0], prod: p1.rhs}]});
    rete.addWME(addedWme);

    const w1b = new WME("B1", "touch", "table2");
    console.log('Adding ' + w1b);
    rete.addWME(w1b);
    const [toAdd2, toRemove2] = p2.willFire();
    expect(toAdd2.length).to.equal(1);

    const found = justifications.find((j) => j.wme.fields[0] === 'B1');
    expect(found).to.exist;
    found!.justifications.push({token: toAdd2[0], prod: p2.rhs});

    const w2 = new WME("B3", "on", "B1");
    console.log('Adding ' + w2);
    rete.addWME(w2);

    const [toAdd1b, toRemove1b] = p1.willFire();
    expect(toRemove1b.length).to.equal(1);
    const foundFirstJustification = justifications.find(j => j.justifications.find(jj => jj.token===toRemove1b[0]));
    expect(foundFirstJustification).to.exist;
    foundFirstJustification!.justifications = foundFirstJustification!.justifications.filter(jj => jj.token !== toRemove1b[0]);
    expect(foundFirstJustification?.justifications?.length).to.equal(1);

    const [toAdd2b, toRemove2b] = p2.willFire();
    expect(toRemove2b.length).to.equal(1);
    const foundSecondJustification = justifications.find(j => j.justifications.find(jj => jj.token===toRemove2b[0]));
    expect(foundSecondJustification).to.exist;
    foundSecondJustification!.justifications = foundSecondJustification!.justifications.filter(jj => jj.token !== toRemove2b[0]);
    expect(foundSecondJustification?.justifications?.length).to.equal(0);
    rete.removeWME(foundSecondJustification!.wme);
    justifications = justifications.filter(j => j.wme !== foundSecondJustification!.wme);
    expect(justifications.length).to.equal(0);

    console.log("====\n");

  });
});
