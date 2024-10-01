export const production0GrammarContents = `Productions0 {
Productions = Production+

Production = "(" Condition+ "->" prodName ")"

Condition = MatchCondition | CypherCondition | NotCondition | AggregateCondition

CypherCondition = "cypher" "{" CypherNode CypherRelationship* "}"

CypherNode = "(" cypherVariable? LabelExpression? PropertyKeyValueExpression? PropertyWhereExpression? ")"

PropertyKeyValueExpression = "{" PropertyKeyValuePair PropertyKeyValuePairList* "}"

PropertyKeyValuePairList =  ("," PropertyKeyValuePair)+

PropertyKeyValuePair = cypherVariable ":" constSpecifier

PropertyWhereExpression = "where" NodePropertyComparisonList

NodePropertyComparisonList = NodePropertyComparison ("and" NodePropertyComparisonList)*

NodePropertyComparison = QualifiedProperty comp constSpecifier

QualifiedProperty = cypherVariable "." cypherVariable

LabelExpression = ":" LabelTerm

LabelTerm = labelIdentifier LabelModifiers?

LabelModifiers = LabelConjunction
 
LabelConjunction = "&" LabelTerm 
 
labelIdentifier = (alnum | "_")+

cypherVariable = alnum+

CypherRelationship = RelationshipPattern CypherNode

RelationshipPattern = FullPattern | abbreviatedRelationship

FullPattern =
   "<-[" PatternFiller "]-"
 | "-[" PatternFiller "]->"
 
PatternFiller =  cypherVariable? LabelExpression? PropertyKeyValueExpression? PropertyWhereExpression?

abbreviatedRelationship = "<--" | "-->"

MatchCondition = "(" MatchSpecifier MatchSpecifier MatchSpecifier ")" ("as" varSpecifier)?

AggregateCondition = "(" varSpecifier "<-" AggrSpecifier ")" "from"  "{" Condition+ "}"

MatchSpecifier = varSpecifier | constSpecifier | Expr

Expr = "(" MathExpr op MathExpr ")"

MathExpr = MatchSpecifier

op = "+" | "-" | "*" | "/"

constSpecifier = (alnum | "-" | "_")+ | quotedConst | comp

quotedConst = "\\"" (alnum | space | "-" | "_")+ "\\""

comp = "=" | "<>" | ">" | ">=" | "<" | "<="

varSpecifier = "<" alnum+ ">"

AggrSpecifier =  "#" (alnum)+ "(" MatchOrOp? ")"

MatchOrOp =  OpExpr | varSpecifier | constSpecifier

OpExpr = MathExpr op MathExpr

NotCondition = "-" "{" Condition+ "}"

prodName = "\\"" (alnum|" ")+ "\\""

}
`;
