package middlewares

import (
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

type Resolver = func(graphql.ResolveParams) (interface{}, error)

type Middleware interface {
	Wrap(next Resolver) Resolver
}

type DirectiveExtension interface {
	SDL() string
	CreateMiddleware(f *ast.FieldDefinition, d *ast.Directive) Middleware
}

type SdlContainer struct {
	Sdl string
}

func (s *SdlContainer) SDL() string {
	return s.Sdl
}

type MiddlewareFactrory struct {
	Init func(f *ast.FieldDefinition, d *ast.Directive) Middleware
}

func (mf *MiddlewareFactrory) CreateMiddleware(f *ast.FieldDefinition, d *ast.Directive) Middleware {
	return mf.Init(f, d)
}

type DirectiveDefinitionContainer struct {
	SdlContainer
	MiddlewareFactrory
}

// CreateDirectiveDefintion initiates a DirectiveDefintion
func CreateDirectiveDefintion(init func(*ast.FieldDefinition, *ast.Directive) Middleware, sdl string) *DirectiveDefinitionContainer {
	r := new(DirectiveDefinitionContainer)
	r.Sdl = sdl
	r.Init = init
	return r
}
