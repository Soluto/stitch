package common

//heavily inspired by OPA server implementation

import (
	"fmt"
	"github.com/graphql-go/graphql"
	opaAst "github.com/open-policy-agent/opa/ast"
	"github.com/open-policy-agent/opa/loader"
	"github.com/open-policy-agent/opa/rego"
	"github.com/vektah/gqlparser/ast"
	"graphql-gateway/directives/middlewares"
	"net/url"
	"strconv"
	"strings"
)

type OpaInput struct {
	Claims    interface{} `json:"claims,omitempty"`
	FieldName string      `json:"filedName,omitempty"`
}

var opa = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		fmt.Println("starting...")
		paths := []string{""}
		opaLoadResult, err := loader.All(paths)
		fmt.Println("starting...", opaLoadResult)

		if err != nil {
			panic("hello")
		}

		fmt.Println("starting...", opaLoadResult)

		query := stringPathToDataRef(d.Arguments.ForName("query").Value.Raw).String()
		return middlewares.Leaf(func(p graphql.ResolveParams) (interface{}, error) {
			results, err := runQuery(p, *opaLoadResult, query)

			if err != nil {
				return nil, err
			}

			value := results[0].Expressions[0].Value

			switch v := value.(type) {
			case bool:
				if value.(bool) {
					panic("hello")
				}
				fmt.Println("mystring is:", v)
			default:
				return nil, fmt.Errorf("unsupported opa result of type: %s", v)
			}

			return "hello", nil
		})
	},
}

func runQuery(resolveParams graphql.ResolveParams, opaResult loader.Result, path string) (results rego.ResultSet, err error) {

	compiler, err := opaResult.Compiler()

	if err != nil {
		return results, err
	}

	store, err := opaResult.Store()

	input := OpaInput{}
	input.Claims = resolveParams.Context.Value("claims")
	input.FieldName = resolveParams.Info.FieldName

	rego := rego.New(
		rego.Compiler(compiler),
		rego.Store(store),
		rego.Query(path),
		rego.Input(input),
	)

	output, err := rego.Eval(resolveParams.Context)
	return output, err
}

func stringPathToDataRef(s string) (r opaAst.Ref) {
	result := opaAst.Ref{opaAst.DefaultRootDocument}
	result = append(result, stringPathToRef(s)...)
	return result
}

func stringPathToRef(s string) (r opaAst.Ref) {
	if len(s) == 0 {
		return r
	}
	p := strings.Split(s, "/")
	for _, x := range p {
		if x == "" {
			continue
		}
		if y, err := url.PathUnescape(x); err == nil {
			x = y
		}
		i, err := strconv.Atoi(x)
		if err != nil {
			r = append(r, opaAst.StringTerm(x))
		} else {
			r = append(r, opaAst.IntNumberTerm(i))
		}
	}
	return r
}
