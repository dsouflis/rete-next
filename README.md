# Rete-Next
Implementation of RETE, based on the C++ implementation in https://github.com/bollu/rete.
That was based in the exposition of basic Rete in [Robert B. Doorenbos' PhD Thesis: Production Matching for Large Learning Systems](http://reports-archive.adm.cs.cmu.edu/anon/1995/CMU-CS-95-113.pdf).
The original state of this project was a failthful transcription of that implementation
in TypeScript.

## Enhancements
### Tests
The original 'tests' were rewritten as real Unit tests in Mocha.

### Intra-condition tests
The original implementation lacked intra-condition tests (repetion of the same variable within the same condition)
and this was added.

### Partial matches
The original implementation only supported partial matches. An operation was added
to retrieve partial matches (initial version exists).

### Arithmetic tests
The ability to do arithmetic tests between variables of intra-condition, or across conditions, was added.
