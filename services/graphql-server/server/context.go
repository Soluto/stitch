package server

import (
	upstreams "agogos/extensions/upstreams"
	"context"
	"net/http"
)

type serverContext struct {
	upstreams  map[string]upstreams.Upstream
	exportKeys map[string]map[string][]string
}

type ServerContext interface {
	Upstream(host string) (upstreams.Upstream, bool)
	ExportKeys() map[string]map[string][]string
}

func (sc *serverContext) Upstream(host string) (upstreams.Upstream, bool) {
	up, ok := sc.upstreams[host]
	return up, ok
}

func (sc *serverContext) ExportKeys() map[string]map[string][]string {
	return sc.exportKeys
}

func CreateServerContext(ups map[string]upstreams.Upstream) ServerContext {
	return &serverContext{
		upstreams:  ups,
		exportKeys: make(map[string]map[string][]string),
	}
}

type serverContextKey struct{}

func GetServerContext(ctx context.Context) ServerContext {
	val := ctx.Value(serverContextKey{})

	if serverCtx, ok := val.(ServerContext); ok {
		return serverCtx
	} else {
		return nil
	}
}

func BindServerContext(r *http.Request, value ServerContext) *http.Request {
	parentCtx := r.Context()
	ctx := context.WithValue(parentCtx, serverContextKey{}, value)

	return r.WithContext(ctx)
}
