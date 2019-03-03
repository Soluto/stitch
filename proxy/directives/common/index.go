package common

import "graphql-gateway/directives/middlewares"

// MiddlewareFactrories common
var MiddlewareDefinitions = getMiddlewareDefinitions()

func getMiddlewareDefinitions() map[string]middlewares.MiddlewareDefinition {
	directives := make(map[string]middlewares.MiddlewareDefinition)
	directives["log"] = log
	directives["overrideContext"] = overrideContext
	directives["stub"] = stub
	return directives
}
