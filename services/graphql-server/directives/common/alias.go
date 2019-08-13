package common

import (
	"agogos/directives/middlewares"

	"github.com/graphql-go/graphql"
	"github.com/sirupsen/logrus"
	"github.com/vektah/gqlparser/ast"
)

var aliasMiddleware = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		args := d.ArgumentMap(make(map[string]interface{}))
		originalFieldName, ok := args["from"].(string)

		if !ok {
			logrus.Panic("'from' argument missing or not a string in @alias directive")
		}

		return middlewares.Leaf(func(rp graphql.ResolveParams) (interface{}, error) {
			asMap, ok := rp.Source.(map[string]interface{})

			if !ok {
				return nil, nil
			}

			result, ok := asMap[originalFieldName]

			if !ok {
				return nil, nil
			}

			return result, nil
		})
	},
}
