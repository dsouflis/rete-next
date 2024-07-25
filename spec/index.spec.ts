import {expect} from 'chai';
import {
  Condition,
  ConditionArithConst,
  ConditionArithTest,
  ConditionArithVar,
  ConstTestNode,
  Field, FuzzySystem,
  FuzzyVariable,
  FuzzyWME, NegativeCondition,
  Rete,
  TestNode,
  WME,
} from '../index.js';

function sigmoid(a: number, c: number, val: number) {
  return 1 / (1 + Math.exp(-a * (val - c)));
}

class ExcellentAndPoorFuzzyVariable implements FuzzyVariable {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  isFuzzyValue(fuzzyValue: string): boolean {
    return fuzzyValue === "excellent" || fuzzyValue === "poor";
  }

  computeMembershipValueForFuzzyValue(fuzzyValue: string, val: number): number {
    if (fuzzyValue === "excellent") {
      return sigmoid(4, 0.7, val);
    } else { //poor
      return sigmoid(-4, 0.3, val);
    }
  }
  computeValueForFuzzyMembershipValue(fuzzyValue: string, μ: number): number {
    return 0; //dummy
  }

  getName(): string {
    return this.name;
  }
}

class MinMaxFuzzySystem implements FuzzySystem {
  computeConjunction(...μs: number[]): number {
    return Math.min(...μs);
  }

  computeDisjunction(...μs: number[]): number {
    return Math.max(...μs);
  }

}

describe('The library', () => {
/*
// add simple WME to match a production with 1 element.
// First add production, then add WME
  it('works when first adding production, then adding WME', () => {
    console.log("====test1:====\n");
    const rete = new Rete();

    // rete.working_memory.push_back(WME("B1", "color", "red"));
    // rete.working_memory.push_back(WME("B1", "on", "table"));
    // rete.working_memory.push_back(WME("B2", "left-of", "B3"));
    // rete.working_memory.push_back(WME("B2", "color", "blue"));
    // rete.working_memory.push_back(WME("B3", "left-of", "B4"));
    // rete.working_memory.push_back(WME("B3", "on", "table"));
    // rete.working_memory.push_back(WME("B3", "color", "red"));
    // rete.working_memory.push_back(WME("id", "attr", "val"));

    console.log("adding production\n");

    let lhs = [new Condition(
      Field.var("x"),
      Field.constant("on"),
      Field.var("y"))];
    const p = rete.addProduction(lhs, "prod1");

    console.log("added production\n");

    rete.addWME(new WME("B1", "on", "B2"));
    expect(p.items.length).to.equal(1);

    rete.addWME(new WME("B1", "on", "B3"));
    expect(p.items.length).to.equal(2);

    console.log("====\n");
  });

// add simple WME to match a production with 1 element.
// First add WME, then add production
  it("works when first adding WME, then adding production", () => {
    console.log("====test2:====\n");
    const rete = new Rete();


    rete.addWME(new WME("B1", "on", "B2"));
    rete.addWME(new WME("B1", "on", "B3"));

    let lhs = [new Condition(
      Field.var("x"),
      Field.constant("on"),
      Field.var("y"))];
    const p = rete.addProduction(lhs, "prod1");

    expect(p.items.length).to.equal(2);

    console.log("====\n");
  });

// add simple WME to match a production with 1 element.
// First add WME, then add production
// mismatches also exist.
  it("works when first adding WME, then adding production, when other WMEs exist", () => {
    console.log("====test3:====\n");

    const rete = new Rete();

    rete.addWME(new WME("B1", "on", "B2"));
    rete.addWME(new WME("B1", "on", "B3"));
    rete.addWME(new WME("B1", "color", "red"));

    let lhs = [new Condition(
      Field.var("x"),
      Field.constant("on"),
      Field.var("y"))];
    const p = rete.addProduction(lhs, "prod1");

    expect(p.items.length).to.equal(2);

    console.log("====\n");
  });

// Test repeated node variables: (x on x)
// NOTE: I can't find a single place where they actually handle
// this case, which makes me suspect that this case is *NOT HANDLED*
// by the rete exposition I'm following.
  it('handles repeated variables', () => {
    console.log("====test4:====\n");

    const rete = new Rete();

    // addWME(rete, new WME("B1", "on", "B2"));
    // addWME(rete, new WME("B1", "on", "B3"));
    // addWME(rete, new WME("B1", "on", "B1")); // MATCH
    // addWME(rete, new WME("B1", "color", "red"));

    let lhs = [new Condition(
      Field.var("x"),
      Field.constant("on"),
      Field.var("x"))];
    const p = rete.addProduction(lhs, "prod1");
    rete.addWME(new WME("B1", "on", "B2"));
    rete.addWME(new WME("B1", "on", "B3"));
    rete.addWME(new WME("B1", "on", "B1")); // MATCH
    rete.addWME(new WME("B1", "color", "red"));

    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });

// test a production with 2 conditions. This will
// test chaining of join nodes.
// only (B1 on B2) (B2 left-of B3) ought to join.
// Add WME, then add production
  it('works when joining two conditions, first adding WME, then adding production', () => {
    console.log("====test 5:====\n");

    const rete = new Rete();

    rete.addWME(new WME("B1", "on", "B2"));
    rete.addWME(new WME("B1", "on", "B3"));
    rete.addWME(new WME("B2", "left-of", "B3"));

    const conds: Condition[] = [];
    conds.push(new Condition(Field.var("x"), Field.constant("on"),
      Field.var("y")));
    conds.push(new Condition(Field.var("y"), Field.constant("left-of"),
      Field.var("z")));

    const p = rete.addProduction(conds, "prod1");
    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });

// Same as test5, but opposite order:
// Add production, then add WME
  it('works when joining two conditions, first adding production, then adding WME', () => {
    console.log("====test6:====\n");

    const rete = new Rete();


    const conds: Condition[] = [];
    conds.push(new Condition(Field.var("x"), Field.constant("on"),
      Field.var("y")));
    conds.push(new Condition(Field.var("y"), Field.constant("left-of"),
      Field.var("z")));

    const p = rete.addProduction(conds, "prod1");

    rete.addWME(new WME("B1", "on", "B2"));
    rete.addWME(new WME("B1", "on", "B3"));
    rete.addWME(new WME("B2", "left-of", "B3"));

    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });

// Example from the Doorenbos paper
  it('works with the example in the paper', () => {
    console.log("====test from paper:====\n");

    const rete = new Rete();

    rete.addWME(new WME("B1", "on", "B2"));
    rete.addWME(new WME("B1", "on", "B3"));
    rete.addWME(new WME("B1", "on", "B1"));
    rete.addWME(new WME("B1", "color", "red"));

    const conds: Condition[] = [];
    conds.push(new Condition(Field.var("x"), Field.constant("on"), Field.var("y")));
    conds.push(new Condition(Field.var("y"), Field.constant("left-of"), Field.var("z")));
    conds.push(new Condition(Field.var("z"), Field.constant("color"), Field.constant("red")));
    conds.push(new Condition(Field.var("a"), Field.constant("color"), Field.constant("maize")));
    conds.push(new Condition(Field.var("b"), Field.constant("color"), Field.constant("blue")));
    conds.push(new Condition(Field.var("c"), Field.constant("color"), Field.constant("green")));
    conds.push(new Condition(Field.var("d"), Field.constant("color"), Field.constant("white")));
    conds.push(new Condition(Field.var("s"), Field.constant("on"), Field.constant("table")));
    conds.push(new Condition(Field.var("y"), Field.var("a"), Field.var("b")));
    conds.push(new Condition(Field.var("a"), Field.constant("left-of"), Field.var("d")));
    rete.addProduction(conds, "prod1")

    const foundAlphaForOn = rete.consttestnodes.filter((x: TestNode) => x instanceof ConstTestNode).find((x: ConstTestNode) => x.field_to_test === 1 && x.field_must_equal === "on")?.output_memory;
    expect(foundAlphaForOn?.items?.length).to.equal(3);

    const foundAlphaForColor = rete.consttestnodes
      .filter((x: TestNode) => x instanceof ConstTestNode).find((x: ConstTestNode) => x.field_to_test === 1 && x.field_must_equal === "color")
      ?.children?.filter((x: TestNode) => x instanceof ConstTestNode)?.find((x: ConstTestNode) => x.field_to_test === 2 && x.field_must_equal === "red")
      ?.output_memory;
    expect(foundAlphaForColor?.items?.length).to.equal(1);

    console.log("====\n");
  });

  it('can get partial matches for token prefixes', () => {
    console.log("====partial matches for token prefixes:====\n");

    const rete = new Rete();


    const conds: Condition[] = [];
    conds.push(new Condition(Field.var("x"), Field.constant("hunts"), Field.var("y")));
    conds.push(new Condition(Field.var("y"), Field.constant("eats"), Field.var("z")));
    conds.push(new Condition(Field.var("z"), Field.constant("help"), Field.var("w")));
    console.log('Rule Conditions:')
    console.log(conds.map(c => c.toString()).join(' '));

    const p = rete.addProduction(conds, "hunting something that eats something");

    rete.addWME(new WME("Elmer", "hunts", "Bugs"));

    let incTokens;
    incTokens= rete.getIncompleteTokensForProduction("hunting something that eats something");
    console.log('New Conditions 1:')

    expect(incTokens.length).to.equal(1);
    expect(incTokens[0].toString()).to.equal("(Elmer hunts Bugs),(Bugs eats <_0>)");

    rete.addWME(new WME("Bugs", "eats", "carrots"));
    rete.addWME(new WME("carrots", "help", "eyesight"));

    incTokens = rete.getIncompleteTokensForProduction("hunting something that eats something");

    expect(incTokens.length).to.equal(0);

    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });

  it('can remove a WME', () => {
    console.log("====remove====\n");

    const rete = new Rete();


    const conds: Condition[] = [];
    conds.push(new Condition(Field.var("x"), Field.constant("hunts"), Field.var("y")));
    conds.push(new Condition(Field.var("y"), Field.constant("eats"), Field.var("z")));
    conds.push(new Condition(Field.var("z"), Field.constant("help"), Field.var("w")));

    const p = rete.addProduction(conds, "hunting something that eats something");

    console.log('==== adding ====');
    const w3 = new WME("carrots", "help", "eyesight");
    const w1 = new WME("Elmer", "hunts", "Bugs");
    const w2 = new WME("Bugs", "eats", "carrots");
    rete.addWME(new WME("Tom", "hunts","Jerry"));
    rete.addWME(new WME("Jerry", "eats","cheese"));
    rete.addWME(new WME("cheese", "help","mood"));
    rete.addWME(w1);
    rete.addWME(w2);
    rete.addWME(w3);

    expect(p.items.length).to.equal(2);

    console.log('==== removing ========');
    rete.removeWME(w2);

    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });

  it('works with intra arith condition when first adding production, then adding WME', () => {
    console.log("====intra arith condition:====\n");
    const rete = new Rete();

    console.log("adding production\n");

    const condition = new Condition(
      Field.var("x"),
      Field.constant("weighs"),
      Field.var("y"));
    condition.intraArithTests.push(new ConditionArithTest(new ConditionArithVar("y"), '>', new ConditionArithConst(2)));
    let lhs = [condition];
    const p = rete.addProduction(lhs, "prod1");

    console.log("added production\n");

    rete.addWME(new WME("B1", "weighs", "1"));
    expect(p.items.length).to.equal(0);

    const wme = new WME("B2", "weighs", "3");
    rete.addWME(wme);
    expect(p.items.length).to.equal(1);

    rete.removeWME(wme);
    expect(p.items.length).to.equal(0);

    console.log("====\n");
  });

  it('works with arith condition in join when first adding production, then adding WME', () => {
    console.log("====arith condition in join:====\n");
    const rete = new Rete();

    console.log("adding production\n");

    const condition1 = new Condition(
      Field.var("x"),
      Field.constant("needs"),
      Field.var("y"));
    const condition2 = new Condition(
      Field.var("x"),
      Field.constant("consumes"),
      Field.var("z"));
    condition2.extraArithTests.push(new ConditionArithTest(new ConditionArithVar("y"), '>', new ConditionArithVar("z")));
    let lhs = [condition1, condition2];
    const p = rete.addProduction(lhs, "caloric deficit");

    console.log("added production\n");

    rete.addWME(new WME("B1", "needs", "1600"));
    rete.addWME(new WME("B1", "consumes", "1700"));
    expect(p.items.length).to.equal(0);

    rete.addWME(new WME("B2", "needs", "1600"));
    rete.addWME(new WME("B2", "consumes", "1500"));
    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });


  it('works with fuzzy condition', () => {
    console.log("====fuzzy condition:====\n");
    const rete = new Rete();


    rete.addFuzzyVariable(new ExcellentAndPoorFuzzyVariable("food"));

    console.log("adding production\n");

    const condition1 = new Condition(
      Field.var("x"),
      Field.constant("food"),
      Field.constant("excellent"));
    let lhs = [condition1];
    const p = rete.addProduction(lhs, "fuzzy inference");

    console.log("added production\n");

    rete.addWME(new WME("B1", "food", "0.3"));
    expect(p.items.length).to.equal(1);
    expect((p.items[0].wme as FuzzyWME).μ).to.closeTo(0.1, 0.1);

    rete.addWME(new WME("B2", "food", "0.9"));
    expect(p.items.length).to.equal(2);
    expect((p.items[1].wme as FuzzyWME).μ).to.closeTo(0.7, 0.1);

    console.log("====\n");
  });

  it('works with fuzzy condition 2', () => {
    console.log("=====fuzzy condition 2:====\n");
    const rete = new Rete();

    rete.addFuzzyVariable(new ExcellentAndPoorFuzzyVariable("food"));

    console.log("adding production\n");

    const condition1 = new Condition(
      Field.var("x"),
      Field.constant("food"),
      Field.constant("poor"));
    let lhs = [condition1];
    const p = rete.addProduction(lhs, "fuzzy inference");

    console.log("added production\n");

    rete.addWME(new WME("B1", "food", "0.3"));
    expect(p.items.length).to.equal(1);
    expect((p.items[0].wme as FuzzyWME).μ).to.closeTo(0.5, 0.1);

    rete.addWME(new WME("B2", "food", "0.9"));
    expect(p.items.length).to.equal(2);
    expect((p.items[1].wme as FuzzyWME).μ).to.closeTo(0.1, 0.1);

    console.log("====\n");
  });

  it('works with conjunction of fuzzy conditions', () => {
    console.log("=====conjunction of fuzzy conditions:====\n");
    const rete = new Rete();

    rete.addFuzzyVariable(new ExcellentAndPoorFuzzyVariable("food"));
    rete.addFuzzyVariable(new ExcellentAndPoorFuzzyVariable("service"));

    console.log("adding production\n");

    const conditionFoodIsExcellent = new Condition(
      Field.var("x"),
      Field.constant("food"),
      Field.constant("excellent"));
    const conditionServiceIsExcellent = new Condition(
      Field.var("x"),
      Field.constant("service"),
      Field.constant("excellent"));
    const conditionFoodIsPoor = new Condition(
      Field.var("x"),
      Field.constant("food"),
      Field.constant("poor"));
    const conditionServiceIsPoor = new Condition(
      Field.var("x"),
      Field.constant("service"),
      Field.constant("poor"));

    let lhs1 = [conditionFoodIsExcellent, conditionServiceIsExcellent];
    const p1 = rete.addProduction(lhs1, "large tip");

    let lhs2 = [conditionFoodIsPoor, conditionServiceIsPoor];
    const p2 = rete.addProduction(lhs2, "small tip");

    let lhs3 = [conditionFoodIsExcellent, conditionServiceIsPoor];
    const p3 = rete.addProduction(lhs3, "medium tip");

    console.log("added productions\n");

    rete.addWME(new WME("B1", "food", "0.3"));
    rete.addWME(new WME("B1", "service", "0.9"));
    expect(p1.items.length).to.equal(1);
    expect(p2.items.length).to.equal(1);
    expect(p3.items.length).to.equal(1);

    const minMaxFuzzySystem = new MinMaxFuzzySystem();

    console.log(p1.rhs, p1.items.map(t => t.toString()).join(), minMaxFuzzySystem.computeConjunction(...p1.items[0].toArray().flatMap(w => ((w as FuzzyWME).μ))));
    console.log(p2.rhs, p2.items.map(t => t.toString()).join(), minMaxFuzzySystem.computeConjunction(...p2.items[0].toArray().flatMap(w => ((w as FuzzyWME).μ))));
    console.log(p3.rhs, p3.items.map(t => t.toString()).join(), minMaxFuzzySystem.computeConjunction(...p3.items[0].toArray().flatMap(w => ((w as FuzzyWME).μ))));

    console.log("====\n");
  });
*/

  it('works with negative conditions when adding WMEs first', () => {
    console.log("====negative conditions when adding WMEs first:====\n");
    const rete = new Rete();

    rete.addWME(new WME("B1", "on", "B2"));

    rete.addWME(new WME("B3", "on", "B1"));

    console.log("adding production\n");

    let lhs = [
      new Condition(
        Field.var("x"),
        Field.constant("on"),
        Field.var("y")),
      new NegativeCondition([
        new Condition(
          Field.var("z"),
          Field.constant("on"),
          Field.var("x")),
      ])
    ];
    const p = rete.addProduction(lhs, "prod1");

    console.log("added production\n");

    p.items.forEach(t => console.log(t.toString()));
    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });

/*
  it('works with negative conditions when adding production first', () => {
    console.log("====negative conditions when adding production first:====\n");
    const rete = new Rete();


    console.log("adding production\n");

    let lhs = [
      new Condition(
        Field.var("x"),
        Field.constant("on"),
        Field.var("y")),
      new NegativeCondition([
        new Condition(
          Field.var("z"),
          Field.constant("on"),
          Field.var("x")),
      ])
    ];
    const p = rete.addProduction(lhs, "prod1");

    console.log("added production\n");

    const w1 = new WME("B1", "on", "B2");
    console.log('Adding ' + w1);
    rete.addWME(w1);
    expect(p.items.length).to.equal(1);

    const w2 = new WME("B3", "on", "B1");
    console.log('Adding ' + w2);
    rete.addWME(w2);
    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });
*/

})
