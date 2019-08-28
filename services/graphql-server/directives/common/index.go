package common

import "agogos/directives/middlewares"

// MiddlewareDefinitions common
var MiddlewareDefinitions = map[string]middlewares.MiddlewareDefinition{
	"stub":   stub,
	"http":   httpMiddleware,
	"select": selectMiddleware,
}
