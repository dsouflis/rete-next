export const production0GrammarContents = `Productions0 {
Productions = ProductionItem+

ProductionItem = Production | Query | CypherQuery | Assert | CypherCreate

Query = "(" Condition+ "->" (varSpecifier ("," varSpecifier)? )? ")"

Assert = "(" "!" Condition+ ")"

CypherQuery = match PlainCypherCondition WhereExpression? return  ReturnVariable ("," ReturnVariable)*

CypherCreate = create PlainCypherCondition MoreConditions

MoreConditions = ("," PlainCypherCondition)*

ReturnVariable =  QualifiedProperty | cypherVariable

PlainCypherCondition = CypherNode CypherRelationship*

Production = "(" Condition+ "->" prodName (Assert | CypherCreate)? ")"

Condition = MatchCondition | CypherCondition | NotCondition | YesCondition | AggregateCondition

CypherCondition = cypher "{" CypherNode CypherRelationship* "}"

CypherNode = "(" cypherVariable? LabelExpression? PropertyKeyValueExpression? WhereExpression? ")"

PropertyKeyValueExpression = "{" PropertyKeyValuePair PropertyKeyValuePairList* "}"

PropertyKeyValuePairList =  ("," PropertyKeyValuePair)+

PropertyKeyValuePair = cypherVariable ":" constSpecifier

WhereExpression = where WhereComparisonList

WhereComparisonList = WhereComparison (and WhereComparisonList)*

WhereComparison = WherePart comp WherePart

WherePart = QualifiedProperty | constSpecifier

QualifiedProperty = cypherVariable "." cypherVariable (as cypherVariable)?

LabelExpression = ":" LabelTerm

LabelTerm = labelIdentifier LabelModifiers?

LabelModifiers = LabelConjunction
 
LabelConjunction = "&" LabelTerm 
 
labelIdentifier = (alnum | "_")+

cypherVariable = (alnum | "_")+

CypherRelationship = RelationshipPattern CypherNode

RelationshipPattern = FullPattern | abbreviatedRelationship

FullPattern =
   "<-[" PatternFiller "]-"
 | "-[" PatternFiller "]->"
 
PatternFiller =  cypherVariable? LabelExpression? PropertyKeyValueExpression? WhereExpression?

abbreviatedRelationship = "<--" | "-->"

MatchCondition = "(" MatchSpecifier MatchSpecifier MatchSpecifier ")" (as varSpecifier)?

AggregateCondition = "(" varSpecifier "<-" AggrSpecifier ")" from  "{" Condition+ "}"

MatchSpecifier = varSpecifier | constSpecifier | Expr

Expr = "(" MathExpr op MathExpr ")"

MathExpr = MatchSpecifier

op = "+" | "-" | "*" | "/"

constSpecifier = (alnum | "-" | "_" | ".")+ | quotedConst | comp

delimiter1 =  "\\""

delimiter2 =  "'"

quotedConst = (delimiter1 (~delimiter1 any)* delimiter1) | (delimiter2 (~delimiter2 any)* delimiter2)

comp = "=" | "<>" | ">" | ">=" | "<" | "<="

varSpecifier = "<" (alnum | "_")+ ">"

AggrSpecifier =  "#" (alnum)+ "(" MatchOrOp? ")"

MatchOrOp =  OpExpr | varSpecifier | constSpecifier

OpExpr = MathExpr op MathExpr

NotCondition = "-" "{" Condition+ "}"

YesCondition = "+" "{" Condition+ "}"

prodName = quotedConst

 a = "a" | "A"
 b = "b" | "B"
 c = "c" | "C"
 d = "d" | "D"
 e = "e" | "E"
 f = "f" | "F"
 g = "g" | "G"
 h = "h" | "H"
 i = "i" | "I"
 j = "j" | "J"
 k = "k" | "K"
 l = "l" | "L"
 m = "m" | "M"
 n = "n" | "N"
 o = "o" | "O"
 p = "p" | "P"
 q = "q" | "Q"
 r = "r" | "R"
 s = "s" | "S"
 t = "t" | "T"
 u = "u" | "U"
 v = "v" | "V"
 w = "w" | "W"
 x = "x" | "X"
 y = "y" | "Y"
 z = "z" | "Z"
 
 match = m a t c h
 return = r e t u r n
 cypher = c y p h e r
 where = w h e r e
 and = a n d
 as = a s
 from = f r o m
 create = c r e a t e
}
`;
