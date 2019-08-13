package utils

import "reflect"

func IdentityResolver(fieldName string, source interface{}) (res interface{}, err error) {
	defer Recovery(&err)

	switch source.(type) {

	case map[string]interface{}:
		m := source.(map[string]interface{})
		res = m[fieldName]

	default:
		value := reflect.ValueOf(source)
		f := reflect.Indirect(value).FieldByName(fieldName)
		res = f.Interface()
	}

	return
}
