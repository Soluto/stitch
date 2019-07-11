package upstreams

import (
	upstreamAuthentications "agogos/extensions/upstreams/authentication"
	gqlconfig "agogos/generated"
	"net/http"
)

// Upstream - interface for upstream extension. Allows to change @http directive url or to add headers to http request created in resolver
type Upstream interface {
	ApplyUpstream(req *http.Request)
}

type upstreamStruct struct {
	host    string
	headers map[string]string
	auth    authStruct
}

type authStruct struct {
	authType  string
	authority string
	scope     string
}

func (ep *upstreamStruct) ApplyUpstream(req *http.Request) {
	for header, headerValue := range ep.headers {
		req.Header.Set(header, headerValue)
	}

	// TODO: consider more implicit approach
	ap, ok := upstreamAuthentications.Get(ep.auth.authType, ep.auth.authority)
	if ok {
		ap.AddAuthentication(req, ep.auth.scope)
	}
}

func newUpstream(epConfig *gqlconfig.Upstream) Upstream {
	return &upstreamStruct{
		host: epConfig.Host,
		auth: authStruct{
			authType:  epConfig.Auth.AuthType,
			authority: epConfig.Auth.Authority,
			scope:     epConfig.Auth.Scope,
		},
	}
}

var upstreams map[string]Upstream

// Init initializes endpoint repository by
func Init(epConfigs []*gqlconfig.Upstream) {
	upstreams = make(map[string]Upstream)
	for _, epConfig := range epConfigs {
		upstreams[epConfig.Host] = newUpstream(epConfig)
	}
}

// Get gets Upstream by host
func Get(host string) (Upstream, bool) {
	ep, ok := upstreams[host]
	return ep, ok
}
