package middlewares

import (
	"github.com/graphql-go/graphql"
)

type RequestTransform func(graphql.ResolveParams) graphql.ResolveParams

func (r RequestTransform) Wrap(next Resolver) Resolver {
	return func(g graphql.ResolveParams) (interface{}, error) {
		newParams := r(g)
		return next(newParams)
	}
}
