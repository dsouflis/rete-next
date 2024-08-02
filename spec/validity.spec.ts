import {expect} from 'chai';
import {
  ValidityLeftClosed,
  ValidityLeftOpen,
  Context,
  combineValidities
} from '../validity.js';

describe('combineValidities', () => {
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
