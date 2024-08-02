import {expect} from 'chai';
import {
  ValidityLeftClosed,
  ValidityLeftOpen,
  Context,
  combineValidities,
  contextCommensurate,
} from '../validity.js';

describe('contextCommensurate', () => {
  it('returns false for contexts on different branches', () => {
    const c1 = ['', 'h1'];
    const c2 = ['', 'h2'];
    const b = contextCommensurate(c1, c2);
    expect(b).to.false;

    const b2 = contextCommensurate(c2, c1);
    expect(b2).to.false;
  });

  it('returns true for contexts on the same branch', () => {
    const c1 = ['', 'h1'];
    const c2 = ['', 'h1', 'h2'];
    const b = contextCommensurate(c1, c2);
    expect(b).to.true;

    const b2 = contextCommensurate(c2, c1);
    expect(b2).to.true;
  });
});

describe('combineValidities on the same branch', () => {
  it('works for v1 strictly before closed v2', () => {
    const v1 = new ValidityLeftClosed([''],['','h1']);
    const v2 = new ValidityLeftClosed(['','h1', 'h2'], ['', 'h1', 'h2', 'h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.null;
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 strictly before open v2', () => {
    const v1 = new ValidityLeftClosed([''],['','h1']);
    const v2 = new ValidityLeftOpen(['','h1', 'h2']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.null;
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v2 strictly before closed v1', () => {
    const v2 = new ValidityLeftClosed([''],['','h1']);
    const v1 = new ValidityLeftClosed(['','h1', 'h2'], ['', 'h1', 'h2', 'h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.null;
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 strictly before open v1', () => {
    const v2 = new ValidityLeftClosed([''],['','h1']);
    const v1 = new ValidityLeftOpen(['','h1', 'h2']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.null;
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 touching closed v2', () => {
    const v1 = new ValidityLeftClosed([''],['','h1']);
    const v2 = new ValidityLeftClosed(['','h1'], ['', 'h1', 'h2', 'h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1'],['','h1']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 touching open v2', () => {
    const v1 = new ValidityLeftClosed([''],['','h1']);
    const v2 = new ValidityLeftOpen(['','h1']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1'],['','h1']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v2 touching closed v1', () => {
    const v2 = new ValidityLeftClosed([''],['','h1']);
    const v1 = new ValidityLeftClosed(['','h1'], ['', 'h1', 'h2', 'h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1'],['','h1']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v2 touching open v1', () => {
    const v2 = new ValidityLeftClosed([''],['','h1']);
    const v1 = new ValidityLeftOpen(['','h1']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1'],['','h1']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 overlapping closed v2', () => {
    const v1 = new ValidityLeftClosed([''],['','h1', 'h2']);
    const v2 = new ValidityLeftClosed(['','h1'], ['', 'h1', 'h2', 'h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1'],['','h1', 'h2']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 overlapping open v2', () => {
    const v1 = new ValidityLeftClosed([''],['','h1', 'h2']);
    const v2 = new ValidityLeftOpen(['','h1']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1'],['','h1', 'h2']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v2 overlapping closed v1', () => {
    const v2 = new ValidityLeftClosed([''],['','h1', 'h2']);
    const v1 = new ValidityLeftClosed(['','h1'], ['', 'h1', 'h2', 'h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1'],['','h1', 'h2']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v2 overlapping open v1', () => {
    const v2 = new ValidityLeftClosed([''],['','h1', 'h2']);
    const v1 = new ValidityLeftOpen(['','h1']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1'],['','h1', 'h2']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });
});

describe('combineValidities on different branch', () => {
  it('works for completely incommensurate v1 and open v2', () => {
    const v1 = new ValidityLeftClosed(['','h1'],['','h1', 'h2']);
    const v2 = new ValidityLeftOpen(['','h2']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.null;
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for completely incommensurate open v1 and v2', () => {
    const v1 = new ValidityLeftOpen(['','h2']);
    const v2 = new ValidityLeftClosed(['','h1'],['','h1', 'h2']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.null;
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for completely incommensurate v1 and v2', () => {
    const v1 = new ValidityLeftClosed(['','h2'],['','h2','h3']);
    const v2 = new ValidityLeftClosed(['','h1'],['','h1', 'h2']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.null;
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for completely incommensurate open v1 and open v2', () => {
    const v1 = new ValidityLeftOpen(['','h2']);
    const v2 = new ValidityLeftOpen(['','h1']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.null;
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for open v1 and open v2 below it', () => {
    const v1 = new ValidityLeftOpen(['','h1']);
    const v2 = new ValidityLeftOpen(['','h1','h2']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(v2);
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for open v1 and open v2 above it', () => {
    const v1 = new ValidityLeftOpen(['','h1','h2']);
    const v2 = new ValidityLeftOpen(['','h1']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(v1);
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for open v1 and v2 below it', () => {
    const v1 = new ValidityLeftOpen(['','h1']);
    const v2 = new ValidityLeftClosed(['','h1','h2'], ['','h1','h2','h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(v2);
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for open v1 and v2 above it', () => {
    const v1 = new ValidityLeftOpen(['','h1','h2']);
    const v2 = new ValidityLeftClosed(['','h1'], ['','h1','h2','h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1','h2'], ['','h1','h2','h3']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 below open v2', () => {
    const v1 = new ValidityLeftClosed(['','h1','h2'], ['','h1','h2','h3']);
    const v2 = new ValidityLeftOpen(['','h1']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(v1);
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 above open v2', () => {
    const v1 = new ValidityLeftClosed(['','h1'], ['','h1','h2','h3']);
    const v2 = new ValidityLeftOpen(['','h1','h2']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1','h2'], ['','h1','h2','h3']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 starting under v2', () => {
    const v1 = new ValidityLeftClosed(['','h1','h2'], ['','h1','h2','h3']);
    const v2 = new ValidityLeftClosed(['','h1'], ['','h1','h2','h4']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1','h2'], ['','h1','h2']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });

  it('works for v1 starting over v2', () => {
    const v1 = new ValidityLeftClosed(['','h1'], ['','h1','h2','h4']);
    const v2 = new ValidityLeftClosed(['','h1','h2'], ['','h1','h2','h3']);
    const combined = combineValidities(v1, v2);
    expect(combined).to.eql(new ValidityLeftClosed(['','h1','h2'], ['','h1','h2']));
    console.log('combineValidities(',v1.toString(),',',v2.toString(),') =', combined?.toString() || 'null');
  });
});
