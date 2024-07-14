import { strict as assert } from 'assert';

enum WMEFieldType {
  None = (-1),
  Ident = 0,
  Attr = 1,
  Val = 2,
  NumFields=3
}

class WME {
    fields: string[] = ['','',''];
    get_field(ty: WMEFieldType) : string {
        assert(ty !== WMEFieldType.None);
        return this.fields[ty];
    }

    constructor(id: string, attr: string, val: string) {
        this.fields[WMEFieldType.Ident] = id;
        this.fields[WMEFieldType.Attr] = attr;
        this.fields[WMEFieldType.Val] = val;
    }

    print() {
      let s = "(";
      for(let f = 0; f < WMEFieldType.NumFields; ++f) {
          s += w.fields[f];
          if (f < WMEFieldType.NumFields - 1) s += " ";
      }
      s += ")";
      return s;
    }
}

const w = new WME('a','b','c');

console.log(w.print());

