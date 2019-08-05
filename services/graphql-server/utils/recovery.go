package utils

import (
	"errors"

	"github.com/sirupsen/logrus"
)

// Recovery - General error recovery returns error
func Recovery(err *error) {
	if r := recover(); r != nil {
		switch x := r.(type) {
		case string:
			*err = errors.New(x)
		case error:
			*err = x
		case *logrus.Entry:
			*err = errors.New(x.Message)
		default:
			*err = errors.New("Unknown panic")
		}
	}
}
