import {expect} from 'chai';
import {WME, Condition, Field, Rete, addWME, add_production, ConstTestNode} from '../index.js';
import exp from "node:constants";

describe('The library', () => {
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
    const p = add_production(rete, lhs, "prod1");

    console.log("added production\n");

    addWME(rete, new WME("B1", "on", "B2"));
    expect(p.items.length).to.equal(1);

    addWME(rete, new WME("B1", "on", "B3"));
    expect(p.items.length).to.equal(2);

    console.log("====\n");
  });

// add simple WME to match a production with 1 element.
// First add WME, then add production
  it("works when first adding WME, then adding production", () => {
    console.log("====test2:====\n");
    const rete = new Rete();


    addWME(rete, new WME("B1", "on", "B2"));
    addWME(rete, new WME("B1", "on", "B3"));

    let lhs = [new Condition(
      Field.var("x"),
      Field.constant("on"),
      Field.var("y"))];
    const p = add_production(rete, lhs,"prod1");

    expect(p.items.length).to.equal(2);

    console.log("====\n");
  });

// add simple WME to match a production with 1 element.
// First add WME, then add production
// mismatches also exist.
  it("works when first adding WME, then adding production, when other WMEs exist", () => {
    console.log("====test3:====\n");

    const rete = new Rete();

    addWME(rete, new WME("B1", "on", "B2"));
    addWME(rete, new WME("B1", "on", "B3"));
    addWME(rete, new WME("B1", "color", "red"));

    let lhs = [new Condition(
      Field.var("x"),
      Field.constant("on"),
      Field.var("y"))];
    const p = add_production(rete, lhs,"prod1");

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

    addWME(rete, new WME("B1", "on", "B2"));
    addWME(rete, new WME("B1", "on", "B3"));
    addWME(rete, new WME("B1", "on", "B1")); // MATCH
    addWME(rete, new WME("B1", "color", "red"));

    let lhs = [new Condition(
      Field.var("x"),
      Field.constant("on"),
      Field.var("x"))];
    const p = add_production(rete, lhs,"prod1");

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

    addWME(rete, new WME("B1", "on", "B2"));
    addWME(rete, new WME("B1", "on", "B3"));
    addWME(rete, new WME("B2", "left-of", "B3"));

    const conds: Condition[] = [];
    conds.push(new Condition(Field.var("x"), Field.constant("on"),
      Field.var("y")));
    conds.push(new Condition(Field.var("y"), Field.constant("left-of"),
      Field.var("z")));

    const p = add_production(rete, conds, "prod1");
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

    const p = add_production(rete, conds, "prod1");

    addWME(rete, new WME("B1", "on", "B2"));
    addWME(rete, new WME("B1", "on", "B3"));
    addWME(rete, new WME("B2", "left-of", "B3"));

    expect(p.items.length).to.equal(1);

    console.log("====\n");
  });

// Example from the Doorenbos paper
  it('works with the example in the paper', () => {
    console.log("====test from paper:====\n");

    const rete = new Rete();

    addWME(rete, new WME("B1", "on", "B2"));
    addWME(rete, new WME("B1", "on", "B3"));
    addWME(rete, new WME("B1", "on", "B1"));
    addWME(rete, new WME("B1", "color", "red"));

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
    add_production(rete, conds, "prod1");

    const foundAlphaForOn = rete.consttestnodes.find(x => x.field_to_test === 1 && x.field_must_equal === "on")?.output_memory;
    expect(foundAlphaForOn?.items?.length).to.equal(3);

    const foundAlphaForColor = rete.consttestnodes
      .find((x: ConstTestNode) => x.field_to_test === 1 && x.field_must_equal === "color")
      ?.children?.find((x: ConstTestNode) => x.field_to_test === 2 && x.field_must_equal === "red")
      ?.output_memory;
    expect(foundAlphaForColor?.items?.length).to.equal(1);

    console.log("====\n");
  });
})
