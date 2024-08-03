# Nested Search Contexts

Given a knowledge base, one might need to explore various hypotheses. These hypotheses can be tried out, validated, and
perhaps refuted. This activity creates a _Search Space_.

## Search Space supported by a Context Tree
A search space starts from the basic (top) context, which is taken to be comprised by all initial and undisputed facts.
The search process can make various hypotheses, branching off the top context. Sub-contexts are mutually exclusive and
hold different parts of the search space. This branching off can then be repeated, creating a tree of nested search
contexts. 

![Search Space](./drawio/Context%20Tree.png)

## Validity Expressions

Produced facts are added at the level of the sub-context. Facts can also be removed by a production at the level of a 
sub-context. The validity of facts is defined on parts of the tree. The fact is essentially absent in the rest of 
the tree. Assume that a fact is asserted at _h1_ on the sample context tree.

![Validity under h1](./drawio/Context%20under%20h1.png)

Not only is it valid in all the colored contexts, but it is valid in all contexts that may be added under h1 in the
future.

## Syntax

As a matter of convention, let's define some syntax. A context is identified by the path from the top, as in "//h1/h11".
For brevity, the top context is represented by the empty string, so the above context expression means, we start at the
top, we go down through h1, and we arrive at h11.

A validity expression can be either:

* the part of the tree under a context, represented by a left-open interval to infinity, written as `[//h1)`.
* a part of a branch that stops at a context, represented by a left-closed interval, written as `[//h1,//h1/h11\]`.

To make it more prominent, I will indicate a close interval with a single element as a singleton set, like this: 
`{//h1}`.

A validity set will be written in set notation, like this: `{[//h1), [//h1,//h1/h11\]}`.

## Fact Validity

Now assume that this fact is retracted under h11 (h11 is the last context, in that branch, in which this fact 
is present).

![Validity between h1 and h11](./drawio/Context%20between%20h1%20and%20h11.png)

The validity set of this fact is now comprised by two individual validities: the one shown in the above image, 
which affects all contexts in the branch of h11, and the one shown in the image before that, which affects all
other contexts under h1.

# "Truth Maintenance" on a Context Tree

Using a Rete is no different for an inference engine working in a context tree, but the "Truth Maintenance" and the
production of additions and retractions must be modified to take validity sets into account.

## Validity of a Join

During the operation of Rete, facts are "joined" as prescribed by the LHS of a production. When facts are joined in a
_token_ the resulting validity set combines the validity sets of the joined facts. Imagine a production rule that
joins a fact valid on `{[//h1}`, a fact valid on `{[//h1,//h1/h11}`, and a fact valid on `{[//h1/h11,/h1/h11/h112]}`.
The resulting token is valid on `{{//h1/h11}}`.

## Production of additions

A production for which Rete has produced a token, if fired, can add a new fact (WME). This fact will be added with the
same validity set as the token.

## Production of removals

Similarly, if a production removes a fact based on a token, the fact's validity set is pruned just before the last
context in each validity. As a special case, pruning when at the top context, results in actually removing the fact,
producing the expected behavior of normal Rete.

## Production of hypotheses

A production can also create new contexts. Additions and removals can then happen with respect to those contexts. 

## Sample implementation

This interaction between Rete and the inference engine is showcased in 
[truth-maint-validity.spec.ts](./spec/truth-maint-validity.spec.ts). The data structures are not representative of
what an actual implementation that strives to be performant would use, as they are not cross-indexed in all the needed
ways, but they are sufficient to make the point. 
It uses an implementation of [validities](./validity.ts) which is tested [independently](./spec/validity.spec.ts). 
However, the implementation, itself, might be amended in the future. The point is to bring forward the ideas, not to
present a definitive implementation, which might evolve into a completely separate project, anyway.

The test shows the calculations done at two times during the operation of the inference engine that uses the Rete
library. 

* The addition of a WME by a production
* The removal of a WME, used by that production, by a (supposed) other production

You will notice that there are two kinds of justifications: a ProductionJustification, for additions by productions, 
and an AxiomaticJustification, which is for assertions external to the inference engine. This implementation does not
constrain the AxiomaticJustifications to be only for the top context. It is assumed that a user of the inference engine
is at liberty to use it interactively, and maybe supply hypotheses of one's own in any context.
