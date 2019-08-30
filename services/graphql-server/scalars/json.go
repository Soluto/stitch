package scalars

import (
	"strconv"

	"github.com/graphql-go/graphql"
	"github.com/graphql-go/graphql/language/ast"
	"github.com/graphql-go/graphql/language/kinds"
)

func identity(val interface{}) interface{} {
	return val
}

func parseJsonLiteral(literal ast.Value) interface{} {
	switch literal.GetKind() {
	case kinds.StringValue, kinds.BooleanValue:
		return literal.GetValue()

	case kinds.IntValue:
		res, err := strconv.Atoi(literal.GetValue().(string))
		if err != nil {
			return nil
		}
		return res

	case kinds.FloatValue:
		res, err := strconv.ParseFloat(literal.GetValue().(string), 64)
		if err != nil {
			return nil
		}
		return res

	case kinds.ObjectValue:
		if fields, ok := literal.GetValue().([]*ast.ObjectField); ok {
			res := make(map[string]interface{}, len(fields))
			for _, val := range fields {
				res[val.Name.Value] = parseJsonLiteral(val.Value)
			}
			return res
		}

	case kinds.ListValue:
		if list, ok := literal.GetValue().([]ast.Value); ok {
			res := make([]interface{}, len(list))
			for i, val := range list {
				res[i] = parseJsonLiteral(val)
			}
			return res
		}
	}

	return nil
}

var JSON = graphql.NewScalar(graphql.ScalarConfig{
	Name:        "JSON",
	Description: "Standard JSON",

	// Serialize graphql response of JSON type
	Serialize: identity,

	// Parse query variable of JSON type
	ParseValue: identity,

	// Parse query literals of JSON type
	ParseLiteral: parseJsonLiteral,
})
