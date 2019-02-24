package middlewares

import (
	"github.com/graphql-go/graphql"
)

// Resolver represents the GraphQL field resolver signature
type Resolver = func(graphql.ResolveParams) (interface{}, error)

// Wrapper is a middleware resolver srapping function
type Wrapper = func(next Resolver) Resolver

type Middleware interface {
	Wrap(next Resolver) Resolver
}

type RequestTransformer interface {
	transform(p graphql.ResolveParams) graphql.ResolveParams
}

type PreProcessingMiddleware struct {
	RequestTransformer
}

func CreateValueResolver(resolver Resolver) Wrapper {
	return func(next Resolver) Resolver {
		return resolver
	}
}

func (p *PreProcessingMiddleware) CreateRequestTransformer() Wrapper {
	return func(next Resolver) Resolver {
		return func(g graphql.ResolveParams) (interface{}, error) {
			return next(p.transform(g))
		}
	}
}

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
	}
}
