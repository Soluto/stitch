package utils

import "reflect"

func IdentityResolver(fieldName string, source interface{}) (res interface{}, err error) {
	defer Recovery(&err)

	switch src := source.(type) {
	case nil:
		res = nil

	case map[string]interface{}:
		res = src[fieldName]

	default:
		value := reflect.ValueOf(source)
		f := reflect.Indirect(value).FieldByName(fieldName)

		if f.Kind() == reflect.Invalid {
			res = nil
		} else {
			res = f.Interface()
		}
	}

	return
}
