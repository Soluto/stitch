package common

import (
	"agogos/directives/middlewares"
	"agogos/utils"
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
			logrus.WithError(err).Panic("'path' argument not a string array in @select directive")
		}

		return middlewares.ResultTransform(func(rp graphql.ResolveParams, original interface{}) interface{} {
			result := original

			for _, segment := range path {
				result, err = utils.IdentityResolver(segment, result)

				if err != nil {
					logrus.WithField("path", path).WithField("source", original).WithError(err).Infof("Failed extracting value in @select directive")

					return nil
				}
			}

			return result
		})
	},
}
