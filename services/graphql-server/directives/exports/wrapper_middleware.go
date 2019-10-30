package exports

import (
	"agogos/directives/middlewares"
	"agogos/server"
	"agogos/utils"
	"reflect"

	log "github.com/sirupsen/logrus"

	"github.com/graphql-go/graphql"
)

var WrapperMiddleware = middlewares.ResultTransform(func(rp graphql.ResolveParams, result interface{}) interface{} {
	if graphql.IsLeafType(rp.Info.ReturnType) {
		return result
	}

	if _, ok := rp.Info.ReturnType.(*graphql.List); ok {
		resultList := result.([]interface{})
		pcList := make([]interface{}, len(resultList))

		for i, elem := range resultList {
			pcList[i] = wrapWithParentConnector(rp, elem)
		}

		return pcList
	}

	return wrapWithParentConnector(rp, result)
})

func wrapWithParentConnector(rp graphql.ResolveParams, value interface{}) parentConnector {
	return parentConnector{
		Value:  value,
		Parent: rp.Source,
		Type:   rp.Info.ReturnType,
	}
}

func ResolveExport(rp graphql.ResolveParams, exportKey string) interface{} {
	pc, ok := rp.Source.(parentConnector)
	if !ok {
		log.WithField("exportKey", exportKey).WithField("sourceType", reflect.TypeOf(rp.Source)).Infoln("Source not found or is not a parentConnector")
		return nil
	}

	keyMap := server.GetServerContext(rp.Context).GetExportKeys()

	return resolveExport(keyMap, pc, exportKey)
}

func resolveExport(keyMap map[string]map[string][]string, pc parentConnector, exportKey string) interface{} {
	if pc.Type.Name() == "Query" || pc.Type.Name() == "Mutation" {
		return nil
	}

	typeFieldMap, ok := keyMap[exportKey]
	if !ok {
		return nil
	}

	if fields, ok := typeFieldMap[pc.Type.Name()]; ok {
		for _, field := range fields {
			if val, err := utils.IdentityResolver(field, pc.Value); err == nil && val != nil {
				return val
			} else if err != nil {
				log.WithError(err).Warnln("Error while resolving fields in resolveExport")
			}
		}
	}

	parentPc, ok := pc.Parent.(parentConnector)
	if !ok {
		log.WithField("exportKey", exportKey).WithField("sourceType", reflect.TypeOf(pc.Parent)).Infoln("Parent not found or is not a parentConnector")
		return nil
	}

	return resolveExport(keyMap, parentPc, exportKey)
}
