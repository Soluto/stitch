package middlewares

import (
	"context"
	"fmt"
	"github.com/graphql-go/graphql"
)

type Log struct {
}

func (s *Log) Transform(g graphql.ResolveParams) graphql.ResolveParams {
	fmt.Println("got new request with params")
	fmt.Printf("%+v\n", g)
	nc := context.WithValue(g.Context, "override", "abc")

	ng := graphql.ResolveParams{
		Args:    g.Args,
		Context: nc,
		Info:    g.Info,
		Source:  g.Source,
	}

	return ng
}

type OverrideContext struct{}

func (s *OverrideContext) Wrap(next func(graphql.ResolveParams) (interface{}, error)) func(graphql.ResolveParams) (interface{}, error) {
	return CreateResultTransformer(func(g graphql.ResolveParams, value interface{}) interface{} {
		val := g.Context.Value("override")
		if val == nil {
			return val
		} else {
			return value
		}
	})(next)
}
