package server

import (
	upstreams "agogos/extensions/upstreams"
)

type serverContext struct {
	upstreams map[string]upstreams.Upstream
}

type ServerContext interface {
	Upstream(host string) (upstreams.Upstream, bool)
}

func (sc *serverContext) Upstream(host string) (upstreams.Upstream, bool) {
	up, ok := sc.upstreams[host]
	return up, ok
}

func CreateServerContext(ups map[string]upstreams.Upstream) ServerContext {
	return &serverContext{
		upstreams: ups,
	}
}
