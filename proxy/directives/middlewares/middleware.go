package middlewares

import (
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

type DirectiveExtension interface {
	SDL() string
	CreateMiddleware(f *ast.FieldDefinition) Middleware
}

type Resolver = func(graphql.ResolveParams) (interface{}, error)

type Middleware interface {
	Wrap(next Resolver) Resolver
}

/*
func CreateValueResolver(resolver Resolver) Wrapper {
	return func(next Resolver) Resolver {
		return resolver
	}
}
*/

/*
func CreateResultTransformer(transformer func(graphql.ResolveParams, interface{}) interface{}) Wrapper {
	return func(next Resolver) Resolver {
		return func(g graphql.ResolveParams) (interface{}, error) {
			value, err := next(g)
			if err != nil {
				return nil, err
			}
			newValue := transformer(g, value)
			return newValue, err
		}
		newValue := r(g, value)
		return newValue, err
	})
}
*/
