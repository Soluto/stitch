package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMap(t *testing.T) {
	result, err := IdentityResolver("name", map[string]interface{}{"name": "aviv"})

	assert.Nil(t, err)
	assert.Equal(t, "aviv", result)
}

func TestMapMissingValue(t *testing.T) {
	result, err := IdentityResolver("name", map[string]interface{}{})

	assert.Nil(t, err)
	assert.Nil(t, result)
}

func TestStruct(t *testing.T) {
	result, err := IdentityResolver("Name", Person{Name: "aviv"})

	assert.Nil(t, err)
	assert.Equal(t, "aviv", result)
}

func TestStructMissingValue(t *testing.T) {
	result, err := IdentityResolver("Nope", Person{Name: "aviv"})

	assert.Nil(t, err)
	assert.Nil(t, result)
}

type Person struct {
	Name string
}
