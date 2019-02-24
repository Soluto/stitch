package middlewares

import (
	"github.com/graphql-go/graphql"
)

type Stub struct {
	Value interface{}
}

func (s *Stub) Wrap(next func(graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error) {
	return CreateValueResolver(func(g graphql.ResolveParams) (interface{}, error) {
		return s.Value, nil
	})(next)
}
