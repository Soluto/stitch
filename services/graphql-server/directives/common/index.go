package common

import "agogos/directives/middlewares"

// MiddlewareDefinitions common
var MiddlewareDefinitions = map[string]middlewares.MiddlewareDefinition{
	"log":             log,
	"overrideContext": overrideContext,
	"stub":            stub,
	"http":            httpMiddleware,
	"select":          selectMiddleware,
}
