package common

import (
	"context"
	"fmt"
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
	"graphql-gateway/directives/middlewares"
)

var log = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		return middlewares.RequestTransform(func(g graphql.ResolveParams) graphql.ResolveParams {
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
}
