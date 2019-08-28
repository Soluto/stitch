package scalars

import (
	"testing"

	"github.com/graphql-go/graphql/language/ast"
	"github.com/stretchr/testify/assert"
)

func parseLiteral(t *testing.T, val ast.Value) interface{} {
	t.Logf("%T - %+v\n", val.GetValue(), val.GetValue())
	return JSON.ParseLiteral(val)
}

func TestInt(t *testing.T) {
	val := ast.NewIntValue(nil)
	val.Value = "123"

	res := parseLiteral(t, val)

	assert.Equal(t, 123, res)
}

func TestFloat(t *testing.T) {
	val := ast.NewFloatValue(nil)
	val.Value = "123.2"

	res := parseLiteral(t, val)

	assert.Equal(t, 123.2, res)
}

func TestString(t *testing.T) {
	val := ast.NewStringValue(nil)
	val.Value = "something 1!"

	res := parseLiteral(t, val)

	assert.Equal(t, "something 1!", res)
}

func TestBool(t *testing.T) {
	val := ast.NewBooleanValue(nil)
	val.Value = true

	res := parseLiteral(t, val)

	assert.Equal(t, true, res)
}

func TestList(t *testing.T) {
	val1 := ast.NewIntValue(nil)
	val1.Value = "123"

	val2 := ast.NewBooleanValue(nil)
	val2.Value = true

	list := ast.NewListValue(nil)
	list.Values = []ast.Value{val1, val2}

	res := parseLiteral(t, list)

	assert.Equal(t, []interface{}{123, true}, res)
}

func TestObject(t *testing.T) {
	val1 := ast.NewIntValue(nil)
	val1.Value = "123"

	val2 := ast.NewIntValue(nil)
	val2.Value = "1337"

	list := ast.NewListValue(nil)
	list.Values = []ast.Value{val1, val2}

	res := parseLiteral(t, list)

	assert.Equal(t, []interface{}{123, 1337}, res)
}
