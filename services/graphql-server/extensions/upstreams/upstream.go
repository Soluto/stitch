package upstreams

import (
	upstreamAuthentications "agogos/extensions/upstreams/authentication"
	agogos "agogos/generated"
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

func (up *upstreamStruct) ApplyUpstream(req *http.Request) {
	for header, headerValue := range up.headers {
		req.Header.Set(header, headerValue)
	}

	// TODO: consider more implicit approach
	upa, ok := upstreamAuthentications.Get(up.auth.authType, up.auth.authority)
	if ok {
		upa.AddAuthentication(req, up.auth.scope)
	}
}

func From(upConfig *agogos.Upstream) Upstream {
	return &upstreamStruct{
		host: upConfig.Host,
		auth: authStruct{
			authType:  upConfig.Auth.AuthType,
			authority: upConfig.Auth.Authority,
			scope:     upConfig.Auth.Scope,
		},
	}
}

var upstreams map[string]Upstream

// Init initializes upstreams repository by
func Init(upConfigs []*agogos.Upstream) {
	upstreams = make(map[string]Upstream)
	for _, upConfig := range upConfigs {
		upstreams[upConfig.Host] = From(upConfig)
	}
}

// Get gets Upstream by host
func Get(host string) (Upstream, bool) {
	ep, ok := upstreams[host]
	return ep, ok
}
