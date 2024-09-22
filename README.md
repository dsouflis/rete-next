# Rete-Next
Implementation of RETE, based on the C++ implementation in https://github.com/bollu/rete.
That was based in the exposition of basic Rete in [Robert B. Doorenbos' PhD Thesis: Production Matching for Large Learning Systems](http://reports-archive.adm.cs.cmu.edu/anon/1995/CMU-CS-95-113.pdf).
The original state of this project was a failthful transcription of that implementation
in TypeScript.

## Enhancements
### Tests
The original 'tests' were rewritten as real Unit tests in Mocha.

### Intra-condition tests
The original implementation lacked intra-condition tests (repetition of the same variable within the same condition)
and this was added.

### Partial matches
The original implementation only supported full matches. An operation was added
to retrieve partial matches (initial version exists).

### Arithmetic tests
The ability to do arithmetic tests between variables, intra-condition, or across conditions, was added. It is the Inference
Engine's responsibility to classify arithmetic tests into intra-condition or across-condition tests. Comparison is
lenient, to an accuracy of 1e-6.

### Equality tests
As a special case, when a test involves equality comparisons, (□ = □) or (□ <> □), and both operands evaluate to symbols,
the test is done between symbols and not arithmetically.

### Removal of WMEs
A re-match based implementation of WME removals was added.

### Fuzzy inference
For working with fuzzy sets, the concept of a Fuzzy Variable has been added. See [here](./README-fuzzy.md).

### NCCs (Negated Conjunctive Conditions)
An implementation of negated conjunctive conditions has been added, based on the ideas in theDoorenbos thesis. 
It was reimplemented to work with re-match based removals.

### "Truth Maintenance"
A TMS is a separate module from the matcher, but a simple implementation  of what it entails for WME additions 
can be found in the test [truth-maint.spec.ts](./spec/truth-maint.spec.ts). It might evolve
into a helper library, but it's really simple and perhaps not worth it. Keep in mind that cycles are not detected by
this simple implementation.

For each WME that is added by one or more productions, a list of "justifications" is maintained. A justification is a 
token that was produced, and the name of the production. Whenever a production removes a previously produced token,
the corresponding justification is removed from the WME. When a WME no longer has any justification, it is retracted,
causing the same logic to take effect for other productions, perhaps.

### Nested Search Contexts
Given a knowledge base, one might need to explore various hypotheses. These hypotheses can be tried out, validated, and
perhaps refuted. This activity creates a _Search Space_. This is explained in more detail [here](./README-nested.md).


### Removal of productions
Removal of productions was added, taking into account NCC nodes and NCC partner nodes as well.

### Querying
A simple querying facility was added, using a transiently added production.

### Aggregates
Support for computing aggregates has been added. This is explained in more detail [here](./README-agg.md).
