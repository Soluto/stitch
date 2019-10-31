package common

import (
	"agogos/directives/exports"
	"agogos/directives/common/rest"
	"agogos/directives/middlewares"
)

// MiddlewareDefinitions common
var MiddlewareDefinitions = map[string]middlewares.MiddlewareDefinition{
	"stub":     stub,
	"http":     httpMiddleware,
	"select":   selectMiddleware,
	"gql":      gqlMiddleware,
	"rest":     rest.RestMiddleware,
	"exportAs": exports.ExportAsMiddleware,
}
