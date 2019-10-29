package exports

import (
	"agogos/directives/middlewares"
	"agogos/utils"

	"github.com/graphql-go/graphql"
)

var WrapperMiddleware = middlewares.ResultTransform(func(rp graphql.ResolveParams, result interface{}) interface{} {
	if graphql.IsLeafType(rp.Info.ReturnType) {
		return result
	}

	return parentConnector{
		Value:  result,
		Parent: rp.Source,
		Type:   rp.Info.ReturnType,
	}
})

// exportKey->TypeName->[]Field
var keyMap = make(map[string]map[string][]string)

func ResolveExport(value interface{}, exportKey string) interface{} {
	pc, ok := value.(parentConnector)
	if !ok {
		// Log, this shouldn't happen I think? Maybe around Query
		return nil
	}

	return resolveExport(keyMap, pc, exportKey)
}

func resolveExport(contextMap map[string]map[string][]string, pc parentConnector, exportKey string) interface{} {
	if pc.Type.Name() == "Query" {
		return nil
	}

	typeFieldMap, ok := contextMap[exportKey]
	if !ok {
		return nil
	}

	if fields, ok := typeFieldMap[pc.Type.Name()]; ok {
		for _, field := range fields {
			if val, err := utils.IdentityResolver(field, pc.Value); err == nil {
				return val
			}
		}

		// TODO: Log the errors or nulls or something?
	}

	parentPc, ok := pc.Parent.(parentConnector)
	if !ok {
		// TODO: Log, this shouldn't happen
		return nil
	}

	return resolveExport(contextMap, parentPc, exportKey)
}
