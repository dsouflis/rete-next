# Fuzzy Inference
## Fuzzy Variable
Interface FuzzyVariable contains the fuzzification/defuzzification logic, for a fuzzy variable (e.g. "food"),
for a set of fuzzy values (e.g. "poor", "mediocre", "excellent"). Implementations of FuzzyVariable can 
be added to Rete with the operation addFuzzyVariable.

Conditions of the form (<ident> fuzzy-var fuzzy-val), where fuzzy-var is a fuzzy variable known to Rete and fuzzy-val
is a fuzzy value for that fuzzy variable, are treated specially. They produce a FuzzyTestNode, whose operation will be
explained shortly. WMEs of the form (<ident> fuzzy-var val), where fuzzy-var is a fuzzy variable known to Rete and 
val is a number, are treated by the FuzzyTestNode. Note that if one uses a fuzzy-var in the attribute position in a 
condition, that will create a normal constant check in the α-network, and WMEs with a symbol value in the value 
position can be matched as usual. The only special case is when both the attribute and the value indicate that the
purpose of this condition is a fuzzy match.

## Fuzzy Matching
A FuzzyTestNode bridges the gap between a WME with a numeric value and fuzzy condition on a fuzzy variable. It is the
only TestNode that propagates a different WME than its input. It creates a special FuzzyWME that replaces the 
value position with the fuzzy value of the condition, and is assigned a membership value for the WMEs numeric value, in
the fuzzy set of the fuzzy variable. The implementation of this fuzzification computation, is up to the FuzzyVariable.

## Production
Inference of matching tokens happens without any modification. The only difference is that FuzzyWMEs are present in the
production token. What the Inference Engine does with them, is out of the scope of the matching algorithm. Typically,
the membership values in the token will be combined with a fuzzy AND, and the resulting value will be used
in the production, perhaps to combine with a fuzzy result variable, and then defuzzify the resulting membership to
produce a crisp WME that can then be added to the WM and continue the cycle. However, there are some considerations
that must be taken into account by the Inference Engine, and will be explained in the following paragraph.

## Combining fuzzy result variables
The process just described, may look superficially correct, in that it mimics hoe a cycle using crisp WMEs works, but
there is an important difference. With crisp WMEs, the combination of multiple rules that "produce" the same result WME,
effortlessly implements the operation of a logical OR. Either one rule may produce a WME, or another, or both may 
produce the same WME and it makes no difference because, either way, the WME will be added if one rule OR another fires.
Because the combination of whatever number of the same WME, is the WME itself. But a fuzzy OR between a fuzzy result 
variable with a resulting membership value μ1 and of a different result fuzzy
variable with a resulting membership value μ2 needs an explicit fuzzy OR.

## Removal and truth maintenance
Allowing removal of WMEs is up to the inference engine. Even for crisp sets, the correct implementation for
truth maintenance, would be to
have a local view of the WM as a multiset, so that WMEs are reference-counted. In that way, if a WME was added by two
productions, and then one of them is not part of the conflict set, the reference count is decreased to 1 and the WME
is not removed from Rete's WM, since one remaining production still infers it. But for fuzzy results, not only a 
reference count, but the corresponding membership values must be retained, so that, if one of the produced results is
retracted, the fuzzy OR can be recomputed with the remaining membership values.
