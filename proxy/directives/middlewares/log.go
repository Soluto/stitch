package middlewares

import (
	"context"
	"fmt"
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

type DirectiveExtension interface {
	SDL() string
	CreateMiddleware(f *ast.FieldDefinition) Middleware
}

type Log struct{}

func (l *Log) SDL() string {
	return "directive @log on FIELD_DEFINITION"
}

func (l *Log) CreateMiddleware(f *ast.FieldDefinition) Middleware {
	return RequestTransformerFunc(func(g graphql.ResolveParams) graphql.ResolveParams {
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
	})
}

var OverrideContext ResultTransformerFunc = func(g graphql.ResolveParams, value interface{}) interface{} {
	val := g.Context.Value("override")
	if val == nil {
		return val
	} else {
		return value
	}
}
