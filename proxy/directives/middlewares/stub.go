package middlewares

import (
	"github.com/graphql-go/graphql"
)

type Stub struct {
	Value interface{}
}

func (s *Stub) Resolve(p graphql.ResolveParams) (interface{}, error) {
	return s.Value, nil
}
