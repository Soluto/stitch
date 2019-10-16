package rest

import (
	"agogos/utils"
	"fmt"

	"github.com/graphql-go/graphql"
)

type nameValue struct {
	name  string
	value string
}

type NameValueList []nameValue

func (nvl NameValueList) replaceParamsForQuery(resolveParams graphql.ResolveParams) NameValueList {
	return nvl._replaceParams(resolveParams, true)
}

func (nvl NameValueList) replaceParams(resolveParams graphql.ResolveParams) NameValueList {
	return nvl._replaceParams(resolveParams, false)
}

func (nvl NameValueList) _replaceParams(resolveParams graphql.ResolveParams, isQuery bool) NameValueList {
	var newList NameValueList

	for _, nvp := range nvl {
		paramName := utils.ReplaceWithParameters(resolveParams, nvp.name)
		values, shouldSpreadArray := _getArrayToSpread(resolveParams, nvp.value, isQuery)

		if !shouldSpreadArray {
			newValue := utils.ReplaceWithParameters(resolveParams, nvp.value)
			newList.append(paramName, newValue)

			continue
		}

		newList._appendArrayValues(paramName, values)
	}

	return newList
}

func (nvl *NameValueList) _appendArrayValues(paramName string, values []interface{}) {
	for _, paramValue := range values {
		newValue := fmt.Sprintf("%v", paramValue)
		nvl.append(paramName, newValue)
	}
}

func (nvl *NameValueList) append(name string, value string) {
	*nvl = append(*nvl, nameValue{
		name:  name,
		value: value,
	})
}

func _getArrayToSpread(resolveParams graphql.ResolveParams, value string, isQuery bool) (valuesArray []interface{}, shouldSpreadArray bool) {
	shouldSpreadArray = false

	if isQuery {
		valuesArray = utils.GetReplacementIfArray(resolveParams, value)
		shouldSpreadArray = valuesArray != nil
	}

	return
}
