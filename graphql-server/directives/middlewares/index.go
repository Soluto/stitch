package middlewares

// Directives common
var Directives = getDirectives()

func getDirectives() map[string]DirectiveExtension {
	directives := make(map[string]DirectiveExtension)
	directives["log"] = Log
	directives["overrideContext"] = OverrideContext
	directives["stub"] = stub
	return directives
}
