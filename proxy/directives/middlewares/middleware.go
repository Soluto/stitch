package middlewares

import (
	"github.com/graphql-go/graphql"
)

type Middleware interface {
	Wrap(next func(graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error)
}

type RequestTransformer interface {
	transform(p graphql.ResolveParams) graphql.ResolveParams
}

type PreProcessingMiddleware struct {
	transformer RequestTransformer
}

func CreateValueResolver(resolver func(graphql.ResolveParams) (interface{}, error)) func(next func(g graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error) {
	return func(next func(graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error) {
		return resolver
	}
}

func (p *PreProcessingMiddleware) CreateRequestTransformer() func(next func(g graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error) {
	return func(next func(graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error) {
		return func(g graphql.ResolveParams) (interface{}, error) {
			return next(p.transformer.transform(g))
		}
	}
}

func CreateResultTransformer(transformer func(graphql.ResolveParams, interface{}) interface{}) func(next func(g graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error) {
	return func(next func(graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error) {
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
