package common

import (
	"agogos/directives/middlewares"
	"fmt"

	"github.com/graphql-go/graphql"
	"github.com/sirupsen/logrus"
	"github.com/vektah/gqlparser/ast"
)

func toStringSlice(slice []interface{}) ([]string, error) {
	result := make([]string, len(slice))
	for i, v := range slice {
		s, ok := v.(string)

		if !ok {
			return nil, fmt.Errorf("couldn't convert %v to a string", v)
		}

		result[i] = s
	}

	return result, nil
}

var selectMiddleware = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		args := d.ArgumentMap(make(map[string]interface{}))
		pathRaw, ok := args["path"].([]interface{})

		if !ok {
			logrus.Panic("'path' argument missing or not an array in @select directive")
		}

		path, err := toStringSlice(pathRaw)

		if err != nil {
			logrus.Panic("'path' argument not a string array in @select directive")
		}

		return middlewares.ResultTransform(func(rp graphql.ResolveParams, result interface{}) interface{} {
			for _, segment := range path {
				asMap, ok := result.(map[string]interface{})

				if !ok {
					return nil
				}

				result, ok = asMap[segment]

				if !ok {
					return nil
				}
			}

			return result
		})
	},
}
