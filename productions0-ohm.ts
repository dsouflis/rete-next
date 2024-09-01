export const production0GrammarContents = `Productions0 {
Productions = Production+

Production = "(" Condition+ "->" prodName ")"

Condition = MatchCondition | NotCondition

MatchCondition = "(" MatchSpecifier MatchSpecifier MatchSpecifier ")" ("from"  "{" Condition+ "}")?

MatchSpecifier = varSpecifier | constSpecifier | AggrSpecifier | Expr

Expr = "(" MathExpr op MathExpr ")"

MathExpr = MatchSpecifier

op = "+" | "-" | "*" | "/"

constSpecifier = (alnum | "-")+ | comp

comp = "=" | "<>" | ">" | ">=" | "<" | "<="

varSpecifier = "<" alnum+ ">"

AggrSpecifier =  "#" (alnum)+ Expr

NotCondition = "-" "{" Condition+ "}"

prodName = "\\"" (alnum|" ")+ "\\""

}`;