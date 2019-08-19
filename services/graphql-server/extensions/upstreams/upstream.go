package upstreams

import (
	"agogos/extensions/upstreams/authentication"
	agogos "agogos/generated"
	"net/http"
)

// Upstream - interface for upstream extension. Allows to change @http directive url or to add headers to http request created in resolver
type Upstream interface {
	ApplyUpstream(req *http.Request)
}

type upstreamStruct struct {
	host         string
	headers      map[string]string
	auth         authStruct
	upstreamAuth authentication.UpstreamAuthentication
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

	if up.upstreamAuth != nil {
		up.upstreamAuth.AddAuthentication(req, up.auth.scope)
	}
}

func CreateFromConfig(upConfig *agogos.Upstream, upsAuth authentication.UpstreamAuthentication) Upstream {
	return &upstreamStruct{
		host: upConfig.Host,
		auth: authStruct{
			authType:  upConfig.Auth.AuthType,
			authority: upConfig.Auth.Authority,
			scope:     upConfig.Auth.Scope,
		},
		upstreamAuth: upsAuth,
	}
}
