import {grammars, Node} from "ohm-js";
import {Rete} from "./index";
import {production0GrammarContents} from "./productions0-ohm";


const g = grammars(production0GrammarContents).Productions0;
const semantics = g.createSemantics();

semantics.addOperation('toRete', {
  Productions(a: Node) {
    return new Rete();
  }
});

export function parseRete(input: string) {
  let matchResult = g.match(input);

  if (matchResult.failed()) {
    return ({
      error: matchResult.message
    });
  } else {
    let dict = semantics(matchResult);
    const rete = dict['toRete'].apply(dict); // const rete = dict.toRete();
    return ({
      rete,
    });
  }
}

