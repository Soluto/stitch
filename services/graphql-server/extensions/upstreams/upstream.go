package upstreams

import (
	"agogos/extensions/upstreams/authentication"
	agogos "agogos/generated"
	"context"
	"net/http"
)

// Upstream - interface for upstream extension. Allows to change @http directive url or to add headers to http request created in resolver
type Upstream interface {
	ApplyUpstream(ctx context.Context, req *http.Request)
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

func (up *upstreamStruct) ApplyUpstream(ctx context.Context, req *http.Request) {
	for header, headerValue := range up.headers {
		req.Header.Set(header, headerValue)
	}

	if up.upstreamAuth != nil {
		up.upstreamAuth.AddAuthentication(ctx, req, up.auth.scope)
	}
}

func CreateUpstream(upConfig *agogos.Upstream, upsAuth authentication.UpstreamAuthentication) Upstream {
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
