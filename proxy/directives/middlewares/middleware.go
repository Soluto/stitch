package middlewares

import (
	"github.com/graphql-go/graphql"
)

type Middleware interface {
	Wrap(next Resolver) Resolver
}

type RequestTransformerFunc func(p graphql.ResolveParams) graphql.ResolveParams

type ResultTransformerFunc func(p graphql.ResolveParams, v interface{}) interface{}

type ResolverFunc func(graphql.ResolveParams) (interface{}, error)

type Resolver interface {
	Resolve(p graphql.ResolveParams) (interface{}, error)
}

func (r ResolverFunc) Resolve(p graphql.ResolveParams) (interface{}, error) {
	return r(p)
}

func (r RequestTransformerFunc) Wrap(next Resolver) Resolver {
	return ResolverFunc(func(g graphql.ResolveParams) (interface{}, error) {
		return next.Resolve(r(g))
	})
}

func (r ResolverFunc) Wrap(wares ...Middleware) Resolver {
	var f Resolver = r
	for _, m := range wares {
		f = m.Wrap(r)
	}
	return f
}

func (r ResultTransformerFunc) Wrap(next Resolver) Resolver {
	return ResolverFunc(func(g graphql.ResolveParams) (interface{}, error) {
		value, err := next.Resolve(g)
		if err != nil {
			return nil, err
		}
		newValue := r(g, value)
		return newValue, err
	})
}
