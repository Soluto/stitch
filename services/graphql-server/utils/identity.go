package utils

import (
	"reflect"
)

type FieldResolver interface {
	Field(fieldName string) (interface{}, error)
}

func IdentityResolver(fieldName string, source interface{}) (res interface{}, err error) {
	defer Recovery(&err)

	switch src := source.(type) {
	case nil:
		res = nil

	case map[string]interface{}:
		res = src[fieldName]

	case FieldResolver:
		res, err = src.Field(fieldName)

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
