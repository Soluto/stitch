package rest

import (
	"agogos/utils"
	"fmt"

	"github.com/graphql-go/graphql"
)

type keyValue struct {
	key   string
	value string
}

type KeyValueList []keyValue

func (kvl KeyValueList) replaceParamsForQuery(resolveParams graphql.ResolveParams) KeyValueList {
	return kvl._replaceParams(resolveParams, true)
}

func (kvl KeyValueList) replaceParams(resolveParams graphql.ResolveParams) KeyValueList {
	return kvl._replaceParams(resolveParams, false)
}

func (kvl KeyValueList) _replaceParams(resolveParams graphql.ResolveParams, isQuery bool) KeyValueList {
	var newList KeyValueList

	for _, kvp := range kvl {
		paramName := utils.ReplaceWithParameters(resolveParams, kvp.key)
		values, shouldSpreadArray := _getArrayToSpread(resolveParams, kvp.value, isQuery)

		if !shouldSpreadArray {
			newValue := utils.ReplaceWithParameters(resolveParams, kvp.value)
			newList.append(paramName, newValue)

			continue
		}

		newList._appendArrayValues(paramName, values)
	}

	return newList
}

func (kvl *KeyValueList) _appendArrayValues(paramName string, values []interface{}) {
	for _, paramValue := range values {
		newValue := fmt.Sprintf("%v", paramValue)
		kvl.append(paramName, newValue)
	}
}

func (kvl *KeyValueList) append(name string, value string) {
	*kvl = append(*kvl, keyValue{
		key:   name,
		value: value,
	})
}

func _getArrayToSpread(resolveParams graphql.ResolveParams, value string, isQuery bool) (valuesArray []interface{}, shouldSpreadArray bool) {
	shouldSpreadArray = false

	if isQuery {
		valuesArray = utils.ResolveSingleArrayTemplate(resolveParams, value)
		shouldSpreadArray = valuesArray != nil
	}

	return
}
