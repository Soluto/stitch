package common

import (
	"context"

	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"

	"github.com/sirupsen/logrus"

	"agogos/directives/middlewares"
)

var log = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		return middlewares.RequestTransform(func(g graphql.ResolveParams) graphql.ResolveParams {
			logrus.Info("got new request with params")
			logrus.Info("%+v\n", g)
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
