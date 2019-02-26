package main

import (
	"errors"
)

// Recovery - General error recovery returns error
func Recovery(err *error) {
	if r := recover(); r != nil {
		switch x := r.(type) {
		case string:
			*err = errors.New(x)
		case error:
			*err = x
		default:
			*err = errors.New("Unknown panic")
		}
	}
}
