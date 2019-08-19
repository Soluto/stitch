package middlewares

import (
	"agogos/server"

	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

type Resolver = func(graphql.ResolveParams) (interface{}, error)

type Middleware interface {
	Wrap(next Resolver) Resolver
}

type MiddlewareFactory = func(server.ServerContext, *ast.FieldDefinition, *ast.Directive) Middleware

type MiddlewareDefinition interface {
	CreateMiddleware(server.ServerContext, *ast.FieldDefinition, *ast.Directive) Middleware
}

type DirectiveDefinition struct {
	MiddlewareFactory MiddlewareFactory
}

func (dd DirectiveDefinition) CreateMiddleware(s server.ServerContext, f *ast.FieldDefinition, d *ast.Directive) Middleware {
	return dd.MiddlewareFactory(s, f, d)
}
