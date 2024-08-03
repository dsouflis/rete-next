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
  TestNode, Token,
  WME,
} from '../index.js';
import {
  ValidityLeftClosed,
  ValidityLeftOpen,
  Context,
  combineValidities,
  combineSetsOfValidities,
  Validity
} from '../validity.js';
import {beforeEach} from "mocha";

class Justification {
  validities: Validity[] = [];
}

class AxiomaticJustification extends Justification {

  constructor() {
    super();
    this.validities = [new ValidityLeftOpen([''])];
  }
}

class ProductionJustification extends Justification {
  token:Token;
  prod: string;

  constructor(token: Token, prod: string) {
    super();
    this.token = token;
    this.prod = prod;
  }
}

type JustificationEntry = { wme: WME, justifications: Justification[]};


function validitiesOfToken(t: Token, justifications: JustificationEntry[]): Validity[] {
  const found = justifications.find(e => e.wme === t.wme);
  if(found) {
    const validitiesOfWme = found.justifications.flatMap(j => j.validities);
    if(t.parent === null) {
      return validitiesOfWme;
    } else {
      const validities = validitiesOfToken(t.parent, justifications);
      const combinedSets = combineSetsOfValidities(validitiesOfWme, validities);
      return combinedSets;
    }
  }
  return [];
}

describe('A user of the library', () => {
  let justifications: JustificationEntry[] = [];

  beforeEach(() => {
    justifications = [];
  });


  it('can maintain the validities of facts', () => {
    console.log("====maintain the validities of facts:====\n");

    const rete = new Rete();


    const conds: Condition[] = [];
    conds.push(new Condition(Field.var("x"), Field.constant("on"),
      Field.var("y")));
    conds.push(new Condition(Field.var("y"), Field.constant("left-of"),
      Field.var("z")));

    const p = rete.addProduction(conds, "prod1");


    const wme1 = new WME("B1", "on", "B2");
    rete.addWME(wme1);
    const wme1justification = new AxiomaticJustification();
    const wme1validities: Validity[] = [new ValidityLeftOpen([''])];
    wme1justification.validities = wme1validities;
    justifications.push({wme: wme1, justifications: [wme1justification]});
    console.log('Adding', wme1.toString(),'{' + wme1validities.map(v => v.toString()).join(',') + '}');

    const wme2 = new WME("B2", "left-of", "B3");
    rete.addWME(wme2);
    const wme2justification = new AxiomaticJustification();
    const wme2validities: Validity[] = [new ValidityLeftOpen(['','h1'])];
    wme2justification.validities = wme2validities;
    justifications.push({wme: wme2, justifications: [wme2justification]});
    console.log('Adding', wme2.toString(),'{' + wme2validities.map(v => v.toString()).join(',') + '}');

    const [tokensToAdd, tokensToRemove] = p.willFire();
    expect(tokensToAdd.length).to.equal(1);
    const token = tokensToAdd[0];

    const addedWme = new WME('B1', 'is', 'candidate');
    const justificationForAdded = new ProductionJustification(token, p.rhs);
    const ofToken = validitiesOfToken(token, justifications);
    justificationForAdded.validities = ofToken;
    justifications.push({ wme: addedWme, justifications: [justificationForAdded]});
    rete.addWME(addedWme);
    console.log('Adding', addedWme.toString(),'{' + ofToken.map(v => v.toString()).join(',') + '}','supposedly by production');
    expect(ofToken.length).to.equal(1);
    expect(ofToken[0]).to.eql(new ValidityLeftOpen(['','h1']));

    console.log('Now pretend that',wme2.toString(),'is hypothetically retracted after level //h1/h2/h3');
    //super-context after more restrictive sub-contexts
    wme2justification.validities = [
      new ValidityLeftClosed(['','h1'], ['', 'h1', 'h2', 'h3']),
      new ValidityLeftOpen(['','h1'])
    ];
    const ofTokenNow = validitiesOfToken(token, justifications);
    justificationForAdded.validities = ofTokenNow;
    expect(ofTokenNow.length).to.equal(2);
    expect(ofTokenNow[0]).to.eql(new ValidityLeftClosed(['','h1'], ['', 'h1', 'h2', 'h3']));
    expect(ofTokenNow[1]).to.eql(new ValidityLeftOpen(['','h1']));
    console.log('Currently', addedWme.toString(),'{' + ofTokenNow.map(v => v.toString()).join(',') + '}','because the branch was pruned');

    console.log("====\n");
  });
});
