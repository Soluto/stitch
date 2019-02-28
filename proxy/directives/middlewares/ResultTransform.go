package middlewares

import (
	"github.com/graphql-go/graphql"
)

type ResultTransform func(graphql.ResolveParams, interface{}) interface{}

func (rt ResultTransform) Wrap(prior Resolver) Resolver {
	return func(g graphql.ResolveParams) (interface{}, error) {
		value, err := prior(g)
		if err != nil {
			return nil, err
		}
		newValue := rt(g, value)
		return newValue, nil
	}
}
