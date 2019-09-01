package utils

import (
	"testing"

	"github.com/graphql-go/graphql"
	"github.com/stretchr/testify/assert"
)

func TestBasic(t *testing.T) {
	rp := graphql.ResolveParams{
		Args:   map[string]interface{}{"arg1": "arg"},
		Source: map[string]interface{}{"source1": "source"},
	}

	res := ReplaceWithParameters(rp, "{args.arg1} - {source.source1}")

	assert.Equal(t, "arg - source", res)
}

func TestMissingProp(t *testing.T) {
	rp := graphql.ResolveParams{
		Args:   map[string]interface{}{},
		Source: map[string]interface{}{},
	}

	res := ReplaceWithParameters(rp, ">a{args.not_there}b<")

	assert.Equal(t, ">ab<", res)
}

func TestZeroResolveParams(t *testing.T) {
	rp := graphql.ResolveParams{}

	res := ReplaceWithParameters(rp, ">{args.not_there}<>{source.not_there_either}<")

	assert.Equal(t, "><><", res)
}
