package server

import (
	upstreams "agogos/extensions/upstreams"
	"agogos/extensions/upstreams/authentication"
)

type serverContext struct {
	upstreams               map[string]upstreams.Upstream
	upstreamAuthentications map[string]map[string]authentication.UpstreamAuthentication
}

type ServerContext interface {
	Upstream(host string) (upstreams.Upstream, bool)
	UpstreamAuthentication(authType, authority string) (authentication.UpstreamAuthentication, bool)
}

func (sc *serverContext) Upstream(host string) (upstreams.Upstream, bool) {
	up, ok := sc.upstreams[host]
	return up, ok
}

func (sc *serverContext) UpstreamAuthentication(authType, authority string) (authentication.UpstreamAuthentication, bool) {
	uasByType, ok := sc.upstreamAuthentications[authType]
	if ok {
		ua, ok := uasByType[authority]
		return ua, ok
	}
	return nil, ok
}

func CreateServerContext(ups map[string]upstreams.Upstream, upsAuth map[string]map[string]authentication.UpstreamAuthentication) ServerContext {
	return &serverContext{
		upstreams:               ups,
		upstreamAuthentications: upsAuth,
	}
}
