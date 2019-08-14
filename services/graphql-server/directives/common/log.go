package common

import (
	"context"

	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"

	"github.com/sirupsen/logrus"

	"agogos/directives/middlewares"
	"agogos/server"
)

var log = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(s server.ServerContext, f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		return middlewares.RequestTransform(func(g graphql.ResolveParams) graphql.ResolveParams {
			logrus.WithField("params", g).Info("Got new request")
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
