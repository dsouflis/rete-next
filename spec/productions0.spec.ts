import {expect} from 'chai';
import {describe} from "mocha";
import {parseRete, ParseSuccess} from '../productions0';
import {evalVariablesInToken, Rete, WME} from "../index";

describe('The Productions0 parser', () => {
  it('can parse the whole of the grammar', () => {
    const input = `( (<x> on <y>) (<y> > (3 + <x>)) -{ (<y> left-of <z>)} (<w> <- #sum(<w>)) from {(<y> on <w>)} -> "prod 1")`;
    const reteParse = parseRete(input);
    expect('specs' in reteParse && reteParse.specs).to.ok;
    if('specs' in reteParse) {
      reteParse.specs.forEach(({lhs, rhs}) => {
        console.log('Added production ' + lhs.map(c => c.toString()) + ' ⇒ ', rhs);
      })
    }
  });

  it('can parse Cypher conditions', () => {
    // const input = `(cypher {(grandparent:Person)-[:parent_of]->(:Person)-[:parent_of]->(grandchild:Person)} -> "prod1")`;
    const input = `(cypher {(:King {name: "Henry IV", age: 30})<--(k:Person&Author&Fisherman where k.age < 30)-[r:left_of {position:"prominent"} where r.distance > 10]->(:Person) } cypher{()-->(:Person)} -> "prod1")`;
    // const input = `(cypher {(n:a_person&journalist)-->(:king)} -> "prod1")`;
    const reteParse = parseRete(input);
    expect('specs' in reteParse && reteParse.specs).to.ok;
    if('specs' in reteParse) {
      reteParse.specs.forEach(({lhs, rhs}) => {
        console.log('Added production ' + lhs.map(c => c.toString()) + ' ⇒ ', rhs);
      })
    }
  });

  it('can parse conditions for reified relations', () => {
    const input = `( (<x> rel <y>) as <r> (<r> date <d>) -> "prod1")`;
    const reteParse = parseRete(input);
    expect('specs' in reteParse && reteParse.specs).to.ok;
    if('specs' in reteParse) {
      const rete = new Rete();
      reteParse.specs.forEach(({lhs, rhs}) => {
        if(!rhs) return;
        rete.addProduction(lhs, rhs);
        console.log('Added production ' + lhs.map(c => c.toString()) + ' ⇒ ', rhs);
      });

      const p = rete.productions.find(p => p.rhs === "prod1");
      expect(p).to.exist;

      const wme = rete.add('a', 'rel', 'b');
      rete.add(wme, 'date', '2024-09-30');
      expect(p!!.items.length).to.equal(1);
      p!!.items.forEach(t => console.log(t.toString()));

    }
  });

  it('can parse productions with simple conditions and add them to a Rete', () => {
    console.log('====can parse productions with simple conditions and add them to a Rete===');
    const input = `( (<x> on <y>) -> "prod1")`;
    const reteParse = parseRete(input);
    console.log(reteParse);
    expect('specs' in reteParse && reteParse.specs).to.ok;

    console.log("adding production\n");
    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;

    for (const {lhs, rhs} of parsed.specs) {
      if(!rhs) return;
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
    expect('specs' in reteParse && reteParse.specs).to.ok;

    console.log("adding production\n");
    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;

    for (const {lhs, rhs} of parsed.specs) {
      if(!rhs) return;
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
    expect('specs' in reteParse && reteParse.specs).to.ok;

    console.log("adding production\n");
    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;

    for (const {lhs, rhs} of parsed.specs) {
      if(!rhs) return;
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
  });

  it('can parse productions with positive conditions, and add them to a Rete', () => {
    console.log("====parse productions with positive conditions, and add them to a Rete:====\n");
    const input = `( (<x> on <y>) +{(<z> on <x>)} -> "prod1")`;
    const reteParse = parseRete(input);
    console.log(reteParse);
    expect('specs' in reteParse && reteParse.specs).to.ok;

    console.log("adding production\n");
    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;

    for (const {lhs, rhs} of parsed.specs) {
      if(!rhs) return;
      rete.addProduction(lhs, rhs);
    }

    const p = rete.productions.find(p => p.rhs === "prod1");

    expect(p).to.exist;
    console.log("added production\n");

    const w1 = new WME("B1", "on", "B2");
    console.log('Adding ' + w1);
    rete.addWME(w1);
    expect(p!!.items.length).to.equal(0);

    const w2 = new WME("B3", "on", "B1");
    console.log('Adding ' + w2);
    rete.addWME(w2);
    expect(p!!.items.length).to.equal(1);
    expect(p!!.items[0].parent?.parent).to.be.null;
    expect(p!!.items[0].wme.fields[0]).to.equal('1');
    expect(p!!.items[0].parent?.wme.fields[0]).to.equal('B1');
    expect(p!!.items[0].parent?.wme.fields[1]).to.equal('on');
    expect(p!!.items[0].parent?.wme.fields[2]).to.equal('B2');

    console.log('Deleting ' + w2);
    rete.removeWME(w2);
    expect(p!!.items.length).to.equal(0);

    console.log("====\n");
  });

  it("can parse productions with SUM aggregate and add them to a Rete", () => {
    console.log("====parse productions with SUM aggregate and add them to a Rete:====\n");

    const input = `( (<x> on <y>) (<cn> <- #sum(<c>)) from {(<y> order <c>)} -> "prod1")`;
    const reteParse = parseRete(input);
    console.log(reteParse);
    expect('specs' in reteParse && reteParse.specs).to.ok;

    console.log("adding production\n");
    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;

    for (const {lhs, rhs} of parsed.specs) {
      if(!rhs) return;
      rete.addProduction(lhs, rhs);
    }

    const p = rete.productions.find(p => p.rhs === "prod1");

    rete.add("B1", "on", "B2");
    rete.add("B1", "on", "B3");
    rete.add("B2", "order", "1200");
    expect(p!!.items.length).to.equal(1);
    console.log(p!!.items[0].toString());
    expect(p!!.items[0].wme.fields[0]).to.equal("1200");

    rete.add("B2", "order", "800");
    expect(p!!.items.length).to.equal(1);
    console.log(p!!.items[0].toString());
    expect(p!!.items[0].wme.fields[0]).to.equal("2000");

    rete.add("B2", "order", "500");
    expect(p!!.items.length).to.equal(1);
    console.log(p!!.items[0].toString());
    expect(p!!.items[0].wme.fields[0]).to.equal("2500");

    console.log("====\n");
  });

  it("can parse queries and run them on a Rete", () => {
    console.log("====can parse queries and run them on a Rete:====\n");

    const input = `((<x> on <y>) (<y> on <z>) -> <x>,<z>) ((<x> on <y>) -> <x>,<y>)`;
    const reteParse = parseRete(input);
    console.log(reteParse);
    expect('specs' in reteParse && reteParse.specs).to.ok;

    console.log("running query\n");
    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;

    rete.add("B1", "on", "B2");
    rete.add("B2", "on", "B3");

    for (const {lhs, variables} of parsed.specs) {
      const stringToStringMaps = rete.query(lhs, variables!);
      expect(stringToStringMaps.length).to.be.oneOf([1,2]);
      console.log(stringToStringMaps);
    }

    console.log("====\n");
  });

  it("can parse Cypher queries and run them on a Rete", () => {
    console.log("====can parse Cypher queries and run them on a Rete:====\n");

    const input = `
    match (x)-[:on]->(y)-[:on]->(z) return x.age, z
    Match (x)-[:on]->(y) where x.age > 10 Return x, x.age
    `;
    const reteParse = parseRete(input);
    expect('specs' in reteParse && reteParse.specs).to.ok;

    console.log("running query\n");
    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;

    rete.add("B1", "age", "66");
    rete.add("B1", "on", "B2");
    rete.add("B2", "on", "B3");

    for (let i = 0; i < parsed.specs.length; i++){
      const {lhs, variables} = parsed.specs[i];
      console.log('Running', lhs.map(c => c.toString()));
      const stringToStringMaps = rete.query(lhs, variables!);
      expect(stringToStringMaps.length).to.equal(1);
      switch (i) {
        case 0: {
          for (const entry of Object.entries(stringToStringMaps[0])) {
            if(entry[0] === 'z') {
              expect(entry[1]).to.equal('B3');
            } else {
              expect(entry[1]).to.equal('66');
            }
          }
        } break;
        default: {
          for (const entry of Object.entries(stringToStringMaps[0])) {
            if(entry[0] === 'x') {
              expect(entry[1]).to.equal('B1');
            } else {
              expect(entry[1]).to.equal('66');
            }
          }
        }
      }
      console.log(stringToStringMaps);
    }

    console.log("====\n");
  });

  it('can parse CREATE clauses', () => {
    console.log('can parse CREATE clauses');
    const input = `create (n:Person )-[:SubjectOf]->(:King), (n)<-[:TaughtBy {level: "primary"}]-(:Teacher)`;
    const reteParse = parseRete(input);
    expect('specs' in reteParse && reteParse.specs).to.ok;

    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;
    console.log('Read:');
    for (const {lhs} of parsed.specs) {
      for(const cond of lhs) {
        console.log(cond.toString());
      }
      rete.addWMEsFromConditions(lhs);
    }

    expect(rete.working_memory.length).to.equal(6);
    console.log('Added:');
    for (const wme of rete.working_memory) {
      console.log(wme.toString());
    }
  });

  it('can parse assert clauses', () => {
    console.log('can parse assert clauses');
    const input = `(!
(foo is-a Person)
(foo SubjectOf bar)
(bar is-a King)
(foo TaughtBy mrjones) as <_11>
(<_11> level primary)
(mrjones is-a Teacher)
)
`;
    const reteParse = parseRete(input);
    expect('specs' in reteParse && reteParse.specs).to.ok;

    const rete = new Rete();
    const parsed = reteParse as ParseSuccess;
    console.log('Read:');
    for (const {lhs} of parsed.specs) {
      for(const cond of lhs) {
        console.log(cond.toString());
      }
      rete.addWMEsFromConditions(lhs);
    }
    expect(rete.working_memory.length).to.equal(6);
    console.log('Added:');
    for (const wme of rete.working_memory) {
      console.log(wme.toString());
    }
  });

  it('does not accept forbidden constructs in assert clauses', () => {
    console.log('does not accept forbidden constructs in assert clauses');
    const input = `(!
(<n> is-a Person) (<n> < 10)
(<n> SubjectOf <_9>)
-{(<_9> is-a King)}
(<n> TaughtBy <_10>) as <_11>
(<_11> level primary)
(<_10> is-a Teacher)
)
`;
    const reteParse = parseRete(input);
    expect('error' in reteParse && reteParse.error).to.ok;
  });

  it('can handle the knowledge graph test', () => {
    console.log('can handle the knowledge graph test');
    const createInitialFacts = `(!
 (Adam father Cain)
 (Adam father Abel)
 (Adam father Seth)
 (Eve mother Cain)
 (Eve mother Abel)
 (Eve mother Seth)
 (Seth father Enosh)
 (Enosh father Kenan)
 (Kenan father Mahalalel)
 (Mahalalel father Jared)
 (Jared father Enoch)
 (Enoch father Methuselah)
 (Methuselah father Lamech)
 (Lamech father Noah)
 (Noah father Shem)
 (Noah father Ham)
 (Noah father Japheth)
 (Terah father Abram)
 (Terah father Nahor)
 (Terah father Haran)
 (Haran father Lot)
 (Abram father Isaac)
 (Sarah mother Isaac)
 (Abraham father Ishmael)
 (Isaac father Esau)
 (Isaac father Jacob)
 (Rebekah mother Esau)
 (Rebekah mother Jacob)
 (Jacob father Reuben)
 (Jacob father Judah)
)    `;
    const reteParseInitialFacts = parseRete(createInitialFacts);
    expect('specs' in reteParseInitialFacts && reteParseInitialFacts.specs).to.ok;

    const rete = new Rete();
    const parsedInitialFacts = reteParseInitialFacts as ParseSuccess;
    console.log('Read:');
    for (const {lhs} of parsedInitialFacts.specs) {
      for(const cond of lhs) {
        console.log(cond.toString());
      }
      rete.addWMEsFromConditions(lhs);
    }
    expect(rete.working_memory.length).to.equal(30);

    const inputProduction = `( (<x> father <z>) (<y> mother <z>) -> "find couples with children" (! (<x> husband <y>) ) )`;
    const reteParseProduction = parseRete(inputProduction);
    console.log(reteParseProduction);
    expect('specs' in reteParseProduction && reteParseProduction.specs).to.ok;

    console.log("adding production\n");
    const parsedProduction = reteParseProduction as ParseSuccess;
    expect(parsedProduction.specs.length).to.equal(1);

    const {lhs: productionLhs, rhs: productionRhs, rhsAssert} = parsedProduction.specs[0];
    const p1 = rete.addProduction(productionLhs, productionRhs!);
    console.log('Added production', productionLhs.map(c => c.toString()).join(','), '⇒', `${p1.rhs}`, rhsAssert?.map(c => c.toString()).join(','));

    const [toAdd, toRemove] = p1.willFire();
    expect(toAdd.length).to.equal(6);
    for (const token of toAdd) {
      expect(token.parent).to.exist;
      const variablesInToken = evalVariablesInToken(Object.keys(p1.locationsOfAllVariablesInConditions), p1.locationsOfAllVariablesInConditions, token);
      console.log(variablesInToken);
      const wmes = rete.addWMEsFromConditions(rhsAssert!, variablesInToken);
      if (wmes.length) {
        console.log('Added', wmes.map(w => w.toString()).join(' '));
      }
    }
    const husbandFactsFound = rete.working_memory.filter(w => w.fields[1] === 'husband');
    expect(husbandFactsFound.length).to.equal(3);
    console.log('Found', husbandFactsFound.length,'husband facts:');
    for (const w of husbandFactsFound) {
      console.log(w.toString());
    }

  });
});
