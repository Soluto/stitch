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

type MiddlewareContext struct {
	ServerContext server.ServerContext
	Parent        *ast.Definition
	Field         *ast.FieldDefinition
	Directive     *ast.Directive
}

type MiddlewareFactory = func(MiddlewareContext) Middleware

type MiddlewareDefinition interface {
	CreateMiddleware(MiddlewareContext) Middleware
}

type DirectiveDefinition struct {
	MiddlewareFactory MiddlewareFactory
}

func (dd DirectiveDefinition) CreateMiddleware(ctx MiddlewareContext) Middleware {
	return dd.MiddlewareFactory(ctx)
}
