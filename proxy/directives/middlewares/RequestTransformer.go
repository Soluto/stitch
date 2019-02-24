package middlewares

import (
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

type RequestTransformer struct {
	Sdl  string
	Init func(f *ast.FieldDefinition) RequestTransform
}

type RequestTransform func(p graphql.ResolveParams) graphql.ResolveParams

// NewRequestTransformer create a RequestTransformer directive definition
func NewRequestTransformer(init func(f *ast.FieldDefinition) RequestTransform, sdl string) *RequestTransformer {
	r := new(RequestTransformer)
	r.Sdl = sdl
	r.Init = init
	return r
}

func (r RequestTransform) Wrap(next Resolver) Resolver {
	return func(g graphql.ResolveParams) (interface{}, error) {
		return next(r(g))
	}
}
