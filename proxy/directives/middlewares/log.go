package middlewares

import (
	"context"
	"fmt"
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

var Log DirectiveExtension = CreateDirectiveDefintion(
	func(f *ast.FieldDefinition) Middleware {
		return RequestTransform(func(g graphql.ResolveParams) graphql.ResolveParams {
			fmt.Println("got new request with params")
			fmt.Printf("%+v\n", g)
			nc := context.WithValue(g.Context, "override", "abc")

			ng := graphql.ResolveParams{
				Args:    g.Args,
				Context: nc,
				Info:    g.Info,
				Source:  g.Source,
			}

			return ng
		})
	},
	"directive @log on FIELD_DEFINITION",
)

var OverrideContext DirectiveExtension = CreateDirectiveDefintion(
	func(f *ast.FieldDefinition) Middleware {
		return ValueTransform(func(g graphql.ResolveParams, value interface{}) interface{} {
			val := g.Context.Value("override")
			if val == nil {
				return val
			} else {
				return value
			}
		})
	},
	"directive @overrideContext on FIELD_DEFINITION",
)
