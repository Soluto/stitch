package middlewares

import (
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

type SdlContainer struct {
	Sdl string
}

type MiddlewareFactrory struct {
	Init func(f *ast.FieldDefinition) Middleware
}

func (s *SdlContainer) SDL() string {
	return s.Sdl
}

type DirectiveDefinitionContainer struct {
	SdlContainer
	MiddlewareFactrory
}

type RequestTransform func(graphql.ResolveParams) graphql.ResolveParams
type ValueTransform func(graphql.ResolveParams, interface{}) interface{}

// NewRequestTransformer create a RequestTransformer directive definition
func CreateDirectiveDefintion(init func(*ast.FieldDefinition) Middleware, sdl string) *DirectiveDefinitionContainer {
	r := new(DirectiveDefinitionContainer)
	r.Sdl = sdl
	r.Init = init
	return r
}

func (r RequestTransform) Wrap(next Resolver) Resolver {
	return func(g graphql.ResolveParams) (interface{}, error) {
		return next(r(g))
	}
}

func (vt ValueTransform) Wrap(next Resolver) Resolver {
	return func(g graphql.ResolveParams) (interface{}, error) {
		value, err := next(g)
		if err != nil {
			return nil, err
		}
		newValue := vt(g, value)
		return newValue, nil
	}
}

func (mf *MiddlewareFactrory) CreateMiddleware(f *ast.FieldDefinition) Middleware {
	return mf.Init(f)
}
