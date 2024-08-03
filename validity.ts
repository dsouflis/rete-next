export type Context = string[];

export class ValidityBase {
  first: Context;

  constructor(first: Context) {
    this.first = first;
  }
}

function contextToString(c: Context) {
  return '/' + c.join('/');
}

export class ValidityLeftClosed extends ValidityBase {
  last: Context;

  constructor(first: Context, last: Context) {
    super(first);
    this.last = last;
  }

  toString() {
    if(contextEqual(this.first, this.last)) return '{' + contextToString(this.first) + '}';
    return '[' + contextToString(this.first) + ',' + contextToString(this.last) + ']';
  }
}

export class ValidityLeftOpen extends ValidityBase {
  toString() {
    return '[' + contextToString(this.first) + ')';
  }
}

export type Validity = ValidityLeftClosed | ValidityLeftOpen;

function equalToPrefix(c1: Context, c2: Context): boolean {
  for (let i = 0; i < c1.length; i++){
    if(c2[i] !== c1[i]) return false;
  }
  return true;
}

function contextMin(c1: Context, c2: Context): Context {
  if(contextStrictlyBefore(c1, c2)) return c1;
  return c2;
}

function contextMax(c1: Context, c2: Context): Context {
  if(contextStrictlyBefore(c1, c2)) return c2;
  return c1;
}

function contextStrictlyBefore(c1: Context, c2: Context): boolean {
  return c1.length < c2.length && equalToPrefix(c1, c2);
}

function contextEqual(c1: Context, c2: Context): boolean {
  return c1.length === c2.length && equalToPrefix(c1, c2);
}

export function contextCommensurate(c1: Context, c2: Context): boolean {
  for (let i = 0; i < Math.min(c1.length, c2.length); i++){
    if(c2[i] !== c1[i]) return false;
  }
  return true;
}

function commonPrefix(c1: Context, c2: Context): Context {
  let ret: Context = [];
  for (let i = 0; i < c1.length; i++){
    if(c2[i] === c1[i]) {
      ret.push(c1[i]);
    } else break;
  }
  return ret;
}

function validityStrictlyBefore(v1: Validity, v2: Validity): boolean {
  if(v1 instanceof ValidityLeftOpen) return false;
  return contextStrictlyBefore(v1.last, v2.first) ;
}

function combineValiditiesOnSameBranch(v1: Validity, v2: Validity): Validity | null {
  if (!validityStrictlyBefore(v1, v2) && !validityStrictlyBefore(v2, v1)) {
    if (v1 instanceof ValidityLeftClosed && contextEqual(v1.last, v2.first)) {
      return new ValidityLeftClosed(v2.first, v2.first);
    } else if (v2 instanceof ValidityLeftClosed && contextEqual(v2.last, v1.first)) {
      return new ValidityLeftClosed(v1.first, v1.first);
    } else if (v1 instanceof ValidityLeftClosed && contextStrictlyBefore(v2.first, v1.last)) {
      if (v2 instanceof ValidityLeftOpen) {
        return new ValidityLeftClosed(contextMax(v1.first, v2.first), v1.last);
      } else {
        return new ValidityLeftClosed(contextMax(v1.first, v2.first), contextMin(v1.last, v2.last));
      }
    } else if (v2 instanceof ValidityLeftClosed && contextStrictlyBefore(v1.first, v2.last)) {
      if (v1 instanceof ValidityLeftOpen) {
        return new ValidityLeftClosed(contextMax(v1.first, v2.first), v2.last);
      } else {
        return new ValidityLeftClosed(contextMax(v1.first, v2.first), contextMin(v1.last, v2.last));
      }
    } else if (v1 instanceof ValidityLeftOpen && v2 instanceof ValidityLeftOpen) {
      return new ValidityLeftOpen(contextMax(v1.first, v2.first));
    }
  }
  return null;
}

function combineValiditiesOnDiffBranches(v1: Validity, v2: Validity): Validity | null {
  if(v1 instanceof ValidityLeftOpen && v2 instanceof ValidityLeftOpen) {
    return new ValidityLeftOpen(contextMax(v1.first, v2.first));
  } else if(v1 instanceof ValidityLeftOpen && v2 instanceof ValidityLeftClosed) {
    return new ValidityLeftClosed(contextMax(v1.first, v2.first), v2.last);
  } else if(v2 instanceof ValidityLeftOpen && v1 instanceof ValidityLeftClosed) {
    return new ValidityLeftClosed(contextMax(v1.first, v2.first), v1.last);
  } else if(v1 instanceof ValidityLeftClosed && v2 instanceof ValidityLeftClosed) {
    const cmnPrefix = commonPrefix(v1.last, v2.last);
    return new ValidityLeftClosed(contextMax(v1.first, v2.first), cmnPrefix);
  }
  return null;
}

export function combineValidities(v1: Validity, v2: Validity): Validity | null {
  if (contextCommensurate(v1.first, v2.first)) { //share at least some path
    if (v1 instanceof ValidityLeftOpen || v2 instanceof ValidityLeftOpen || contextCommensurate(v1.last, v2.last)) { //on same branch
      return combineValiditiesOnSameBranch(v1, v2);
    } else {
      return combineValiditiesOnDiffBranches(v1, v2);
    }
  }
  return null;
}

export function combineSetsOfValidities(s1: Validity[], s2: Validity[]): Validity[] {
  const ret: Validity[] = [];
  for (const s1Element of s1) {
    for (const s2Element of s2) {
      const combinedValidities = combineValidities(s1Element, s2Element);
      if(combinedValidities) {
        ret.push(combinedValidities);
        break;
      }
    }
  }
  return ret;
}
