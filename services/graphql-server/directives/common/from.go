package common

import (
	"agogos/directives/middlewares"
	"agogos/utils"

	"github.com/graphql-go/graphql"
	"github.com/sirupsen/logrus"
	"github.com/vektah/gqlparser/ast"
)

var fromMiddleware = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		args := d.ArgumentMap(make(map[string]interface{}))
		originalFieldName, ok := args["field"].(string)

		if !ok {
			logrus.Panic("'field' argument missing or not a string in @from directive")
		}

		return middlewares.Leaf(func(rp graphql.ResolveParams) (interface{}, error) {
			return utils.IdentityResolver(originalFieldName, rp.Source)
		})
	},
}
