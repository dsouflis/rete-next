# Aggregates in Rete
## Plain Rete infrastructure
Support for aggregates has been added by re-using the existing machinery of the Rete, arranged in a configuration 
reminiscent of how negation is implemented using the NccNode. In the same vein, the aggregate is added as a
pseudo-condition, but in contrast to an NCC, where it only reserves a place for a dummy WME in the token (to avoid
messing up with token traversal), this condition causes a WME with the aggregate value to appear in the token.

In contrast to how calculations for arithmetic conditions where implemented inside the library, support for aggregates
is defined using programming artifacts. This does not preclude some such implementation in the future.

Let's take one of the productions in the corresponding tests as an example:

`(<x> on <y>),(<cn> = SUM(<c>)) from {(<y> order <c>)} ⇒  prod1`

The second condition is an aggregate condition that will cause variable `cn` to hold the sum of all values of `c`
from the condition set inside braces.

Like in NCC syntax, the braces can hold any number of conditions. Like in NCC implementation, these conditions live
in a branch of the Rete underneath the previous conditions of the production, and the resulting tokens are operated
upon by a special beta memory, called an AggregateNode. The AggregateNode is coordinating with a special alpha
memory that holds the current values of the aggregate for each owner token for the tokens maintained by the 
AggregateNode. The owner token is the token, excluding the part that is within in aggregate branch. Essentially, the
tokens are grouped by the owner tokens and the aggregate is computed on the set corresponding to each owner token,
as this set changes.

## The AggregateComputation abstract class
The base class for all implementations of aggregates is an abstract class, `AggregateComputation`. This class
specifies the following operations that every implementation should offer:

    constructor(init: T)
    abstract variables(): string[];
    abstract mapper(map: StringToStringMap): T;
    abstract reducer(v1: T, v2: T): T;
    finalizer(v: T): string { return (v as any).toString(); }

and one value that is injected by the library while compiling the conditions:

    locationInToken: LocationsOfVariablesInConditions = {};

Method `variables` is meant to inform the library of which variables in the token are used by the aggregate.

Method `mapper` is given a map with values for each variable, in a token, and is supposed to compute a 
value for this token.

Method `reducer` is the commutative operation that combines two values.
Constructor parameter `init` is the "zero" element of the `reducer`.

Method `finalizer` may perform some final computation on the resulting value. Defaults to just returning it.
