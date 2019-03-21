package middlewares

import (
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

type Resolver = func(graphql.ResolveParams) (interface{}, error)

type Middleware interface {
	Wrap(next Resolver) Resolver
}

type MiddlewareFactory = func(*ast.FieldDefinition, *ast.Directive) Middleware

type MiddlewareDefinition interface {
	CreateMiddleware(*ast.FieldDefinition, *ast.Directive) Middleware
}

type DirectiveDefinition struct {
	MiddlewareFactory MiddlewareFactory
}

func (dd DirectiveDefinition) CreateMiddleware(f *ast.FieldDefinition, d *ast.Directive) Middleware {
	return dd.MiddlewareFactory(f, d)
}
