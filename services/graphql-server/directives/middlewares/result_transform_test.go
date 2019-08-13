package middlewares

import (
	"errors"
	"testing"

	"github.com/graphql-go/graphql"
	"github.com/stretchr/testify/assert"
)

var error1 = errors.New("oh no")

func TestSimpleResolver(t *testing.T) {
	middleware := ResultTransform(doubleResult)

	resolver := middleware.Wrap(simpleResolver)

	result, err := resolver(graphql.ResolveParams{})

	assert.Nil(t, err)
	assert.Equal(t, 2, result)
}

func TestFailingResolver(t *testing.T) {
	middleware := ResultTransform(doubleResult)

	resolver := middleware.Wrap(failingResolver)

	_, err := resolver(graphql.ResolveParams{})

	assert.Equal(t, error1, err)
}

func TestThunkResolver(t *testing.T) {
	middleware := ResultTransform(doubleResult)

	resolver := middleware.Wrap(thunkResolver)

	resultFn, err := resolver(graphql.ResolveParams{})
	assert.Nil(t, err)

	result, err := (resultFn.(func() (interface{}, error)))()

	assert.Nil(t, err)
	assert.Equal(t, 2, result)
}

// Resolvers
func simpleResolver(rp graphql.ResolveParams) (interface{}, error) {
	return 1, nil
}

func failingResolver(rp graphql.ResolveParams) (interface{}, error) {
	return nil, error1
}

func thunkResolver(rp graphql.ResolveParams) (interface{}, error) {
	return func() (interface{}, error) {
		return 1, nil
	}, nil
}

// Result transformers
func doubleResult(rp graphql.ResolveParams, result interface{}) interface{} {
	if resultInt, ok := result.(int); ok {
		return resultInt * 2
	}

	panic("This should not happen")
}
