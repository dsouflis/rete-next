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
  FuzzyWME, GenericCondition,
  NegativeCondition,
  Rete,
  TestNode,
  WME,
} from '../index';

describe('The library using ChatGPT', () => {
  it('can be fed knowledge graphs from ChatGPT', () => {
    console.log('User:',`Given the text of the Holy Bible, extract up to 30 knowledge triples, by order of chronology,
      for parent-child relations between people, in the form of \`person,relation,person\` on each line.
      Avoid stopwords and any other text than the list of triples.`);
    const triplesString = `1. Adam,father,Cain
2. Adam,father,Abel
3. Adam,father,Seth
4. Eve,mother,Cain
5. Eve,mother,Abel
6. Eve,mother,Seth
7. Seth,father,Enosh
8. Enosh,father,Kenan
9. Kenan,father,Mahalalel
10. Mahalalel,father,Jared
11. Jared,father,Enoch
12. Enoch,father,Methuselah
13. Methuselah,father,Lamech
14. Lamech,father,Noah
15. Noah,father,Shem
16. Noah,father,Ham
17. Noah,father,Japheth
18. Terah,father,Abram
19. Terah,father,Nahor
20. Terah,father,Haran
21. Haran,father,Lot
22. Abram,father,Isaac
23. Sarah,mother,Isaac
24. Abraham,father,Ishmael
25. Isaac,father,Esau
26. Isaac,father,Jacob
27. Rebekah,mother,Esau
28. Rebekah,mother,Jacob
29. Jacob,father,Reuben
30. Jacob,father,Judah`;

    const rete = new Rete();

    const triplesEntries = triplesString.split('\n');
    for (const triplesEntry of triplesEntries) {
      const [id,attr,val] = triplesEntry.split('.')[1].trim().split(',');
      const wme = new WME(id, attr, val);
      rete.addWME(wme);
      console.log('Added', wme.toString());
    }

    const conds: Condition[] = [];
    conds.push(new Condition(Field.var("x"), Field.constant("father"),
      Field.var("z")));
    conds.push(new Condition(Field.var("y"), Field.constant("mother"),
      Field.var("z")));

    const p1 = rete.addProduction(conds, "find couples with children");
    console.log('Added production', conds.map(c => c.toString()).join(','), '⇒', p1.rhs)

    const [toAdd, toRemove] = p1.willFire();
    expect(toAdd.length).to.equal(6);
    for (const token of toAdd) {
      expect(token.parent).to.exist;
      const mother = token.wme.fields[0];
      const father = token.parent!.wme!.fields[0];
      const found = rete.working_memory.find(w => w.fields[0] === father && w.fields[1] === 'husband' && w.fields[2] === mother);
      if(!found) {
        const husbandWme = new WME(father, 'husband', mother);
        rete.addWME(husbandWme);
      }
    }
    const husbandFactsFound = rete.working_memory.filter(w => w.fields[1] === 'husband');
    expect(husbandFactsFound.length).to.equal(3);
    console.log('Found', husbandFactsFound.length,'husband facts:');
    for (const w of husbandFactsFound) {
      console.log(w.toString());
    }

    const conds2: GenericCondition[] = [];
    conds2.push(new Condition(Field.var("x"), Field.constant("father"),
      Field.var("z")));
    conds2.push(new NegativeCondition([new Condition(Field.var("y"), Field.constant("mother"),
      Field.var("z"))]));

    const p2 = rete.addProduction(conds2, "find motherless children");
    console.log('Added production', conds2.map(c => c.toString()).join(','), '⇒', p2.rhs)

    const [toAdd2, toRemove2] = p2.willFire();
    expect(toAdd2.length).to.equal(18);

    for (const token of toAdd2) {
      expect(token.parent).to.exist;
      const child = token.parent!.wme!.fields[2];
      const found = rete.working_memory.find(w => w.fields[1] === child && w.fields[1] === 'motherless');
      if(!found) {
        const motherlessWme = new WME(child, 'motherless', '');
        rete.addWME(motherlessWme);
      }
    }
    const motherlessFactsFound = rete.working_memory.filter(w => w.fields[1] === 'motherless');
    expect(motherlessFactsFound.length).to.equal(18);
    console.log('Found', motherlessFactsFound.length,'motherless facts:');
    for (const w of motherlessFactsFound) {
      console.log(w.toString());
    }
  });
});
