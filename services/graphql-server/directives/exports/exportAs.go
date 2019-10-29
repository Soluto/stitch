package exports

import (
	"agogos/directives/middlewares"

	"github.com/sirupsen/logrus"
)

var ExportAsMiddleware = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(ctx middlewares.MiddlewareContext) middlewares.Middleware {
		args := ctx.Directive.ArgumentMap(make(map[string]interface{}))
		exportKey, ok := args["key"].(string)

		if !ok {
			logrus.Panic("'key' argument missing or not an array in @context directive")
		}

		if _, ok := keyMap[exportKey]; !ok {
			keyMap[exportKey] = make(map[string][]string, 1)
		}

		if _, ok := keyMap[exportKey][ctx.Parent.Name]; !ok {
			keyMap[exportKey][ctx.Parent.Name] = make([]string, 1)
		}

		keyMap[exportKey][ctx.Parent.Name] = append(keyMap[exportKey][ctx.Parent.Name], ctx.Field.Name)

		return middlewares.Identity{}
	},
}
