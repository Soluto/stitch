package middlewares

import (
	"github.com/graphql-go/graphql"
)

type ConcurrentLeaf func(graphql.ResolveParams) (interface{}, error)

func (cl ConcurrentLeaf) Wrap(next Resolver) Resolver {
	type result struct {
		data interface{}
		err  error
	}

	return func(g graphql.ResolveParams) (interface{}, error) {
		ch := make(chan *result, 1)

		go func() {
			defer close(ch)

			data, err := cl(g)

			ch <- &result{data: data, err: err}
		}()

		return func() (interface{}, error) {
			res := <-ch
			return res.data, res.err
		}, nil
	}
}
