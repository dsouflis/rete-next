export const production0GrammarContents = `Productions0 {
Productions = Production+

Production = "(" Condition+ "->" prodName ")"

Condition = MatchCondition | NotCondition | AggregateCondition

MatchCondition = "(" MatchSpecifier MatchSpecifier MatchSpecifier ")"

AggregateCondition = "(" varSpecifier "<-" AggrSpecifier ")" "from"  "{" Condition+ "}"


MatchSpecifier = varSpecifier | constSpecifier | Expr

Expr = "(" MathExpr op MathExpr ")"

MathExpr = MatchSpecifier

op = "+" | "-" | "*" | "/"

constSpecifier = (alnum | "-")+ | comp

comp = "=" | "<>" | ">" | ">=" | "<" | "<="

varSpecifier = "<" alnum+ ">"

AggrSpecifier =  "#" (alnum)+ "(" MatchOrOp? ")"

MatchOrOp =  OpExpr | varSpecifier | constSpecifier

OpExpr = MathExpr op MathExpr

NotCondition = "-" "{" Condition+ "}"

prodName = "\\"" (alnum|" ")+ "\\""

}
`;
