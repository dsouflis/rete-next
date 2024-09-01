import {expect} from 'chai';
import {describe} from "mocha";
import {parseRete} from '../productions0';

describe('The Productions0 parser', () => {
  it('can parse productions', () => {
    const input = `( (<x> on <y>) (<y> > (3 + <x>)) -{ (<y> left-of <z>)} (<w> = #sum(<w> * 2)) from {(<y> on <w>)} -> "prod 1")`;
    const reteParse = parseRete(input);
    console.log(reteParse);
    expect(reteParse.rete).to.exist;
  });
});
