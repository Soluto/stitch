package templating

import (
	"testing"

	"github.com/graphql-go/graphql"
	"github.com/stretchr/testify/assert"
)

func TestReplaceWithParameters_Basic(t *testing.T) {
	rp := graphql.ResolveParams{
		Args:   map[string]interface{}{"arg1": "arg"},
		Source: map[string]interface{}{"source1": "source"},
	}

	res := ReplaceWithParameters(rp, "{args.arg1} - {source.source1}")

	assert.Equal(t, "arg - source", res)
}

func TestReplaceWithParameters_MissingProp(t *testing.T) {
	rp := graphql.ResolveParams{
		Args:   map[string]interface{}{},
		Source: map[string]interface{}{},
	}

	res := ReplaceWithParameters(rp, ">a{args.not_there}b<")

	assert.Equal(t, ">ab<", res)
}

func TestReplaceWithParameters_ZeroResolveParams(t *testing.T) {
	rp := graphql.ResolveParams{}

	res := ReplaceWithParameters(rp, ">{args.not_there}<>{source.not_there_either}<")

	assert.Equal(t, "><><", res)
}

func TestResolveSingleArrayTemplate_BasicArgs(t *testing.T) {
	argVal := []interface{}{1, 2}

	rp := graphql.ResolveParams{
		Args: map[string]interface{}{"arg1": argVal},
	}

	res := ResolveSingleArrayTemplate(rp, "{args.arg1}")

	assert.Equal(t, argVal, res)
}

func TestResolveSingleArrayTemplate_BasicSource(t *testing.T) {
	srcVal := []interface{}{1, 2}

	rp := graphql.ResolveParams{
		Source: map[string]interface{}{"s1": srcVal},
	}

	res := ResolveSingleArrayTemplate(rp, "{source.s1}")

	assert.Equal(t, srcVal, res)
}

func TestResolveSingleArrayTemplate_MoreThanOneTemplate(t *testing.T) {
	rp := graphql.ResolveParams{
		Args:   map[string]interface{}{"arg1": []interface{}{1, 2}},
		Source: map[string]interface{}{"s1": []interface{}{3, 4}},
	}

	res := ResolveSingleArrayTemplate(rp, "{args.arg1}{source.s1}")

	assert.Nil(t, res)
}

func TestResolveSingleArrayTemplate_MissingProp(t *testing.T) {
	rp := graphql.ResolveParams{
		Args: map[string]interface{}{"arg1": []interface{}{1, 2}},
	}

	res := ResolveSingleArrayTemplate(rp, "{args.arg3}")

	assert.Nil(t, res)
}

func TestResolveSingleArrayTemplate_NonArrayProp(t *testing.T) {
	rp := graphql.ResolveParams{
		Args: map[string]interface{}{"arg1": "not an array"},
	}

	res := ResolveSingleArrayTemplate(rp, "{args.arg1}")

	assert.Nil(t, res)
}
