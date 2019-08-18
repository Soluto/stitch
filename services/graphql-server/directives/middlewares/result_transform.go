package middlewares

import (
	"github.com/graphql-go/graphql"
)

type ResultTransform func(graphql.ResolveParams, interface{}) interface{}

func (rt ResultTransform) Wrap(resolve Resolver) Resolver {
	return func(rp graphql.ResolveParams) (interface{}, error) {
		value, err := resolve(rp)
		if err != nil {
			return nil, err
		}

		// Support concurrent resolvers
		if valueFunc, ok := value.(func() (interface{}, error)); ok {
			return func() (interface{}, error) {
				newValue, err := valueFunc()

				if err != nil {
					return nil, err
				}

				return rt(rp, newValue), nil
			}, nil
		}

		return rt(rp, value), nil
	}
}
