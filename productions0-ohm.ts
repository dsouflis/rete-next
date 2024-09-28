export const production0GrammarContents = `Productions0 {
Productions = Production+

Production = "(" Condition+ "->" prodName ")"

Condition = MatchCondition | CypherCondition | NotCondition | AggregateCondition

CypherCondition = "cypher" "{" CypherNode CypherRelationship* "}"

CypherNode = "(" cypherVariable? LabelExpression? ")"

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
 
PatternFiller =  cypherVariable? LabelExpression?

abbreviatedRelationship = "<--" | "-->"

MatchCondition = "(" MatchSpecifier MatchSpecifier MatchSpecifier ")"

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
