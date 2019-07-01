package middlewares

import (
	"github.com/graphql-go/graphql"
)

type Leaf func(graphql.ResolveParams) (interface{}, error)

func (l Leaf) Wrap(next Resolver) Resolver {
	return func(g graphql.ResolveParams) (interface{}, error) {
		return l(g)
	}
}
