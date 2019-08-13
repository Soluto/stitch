package common

import "agogos/directives/middlewares"

// MiddlewareDefinitions common
var MiddlewareDefinitions = getMiddlewareDefinitions()

func getMiddlewareDefinitions() map[string]middlewares.MiddlewareDefinition {
	directives := make(map[string]middlewares.MiddlewareDefinition)
	directives["log"] = log
	directives["overrideContext"] = overrideContext
	directives["stub"] = stub
	directives["http"] = httpMiddleware
	directives["select"] = selectMiddleware
	directives["alias"] = aliasMiddleware
	return directives
}
