package runtime

import (
	"context"
	"net/http"
)

type requestKey struct{}

func GetRequest(ctx context.Context) *http.Request {
	val := ctx.Value(requestKey{})

	if r, ok := val.(*http.Request); ok {
		return r
	} else {
		return nil
	}
}

func BindRequestContext(r *http.Request) *http.Request {
	parentCtx := r.Context()
	ctx := context.WithValue(parentCtx, requestKey{}, r)

	return r.WithContext(ctx)
}
