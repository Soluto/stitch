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
	name1 := ast.NewName(nil)
	name1.Value = "inty"
	field1 := ast.NewObjectField(nil)
	field1.Name = name1
	field1.Value = val1

	val2 := ast.NewBooleanValue(nil)
	val2.Value = false
	name2 := ast.NewName(nil)
	name2.Value = "booly"
	field2 := ast.NewObjectField(nil)
	field2.Name = name2
	field2.Value = val2

	obj := ast.NewObjectValue(nil)
	obj.Fields = []*ast.ObjectField{field1, field2}

	res := parseLiteral(t, obj)

	assert.Equal(t, map[string]interface{}{"inty": 123, "booly": false}, res)
}
