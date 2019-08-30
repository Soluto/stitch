package upstreams

import (
	"agogos/extensions/upstreams/authentication"
	agogos "agogos/generated"
	"context"
	"net/http"
)

// Upstream - interface for upstream extension. Allows to change @http directive url or to add headers to http request created in resolver
type Upstream interface {
	ApplyUpstream(ctx context.Context, header *http.Header)
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

func (up *upstreamStruct) ApplyUpstream(ctx context.Context, header *http.Header) {
	for hKey, hValue := range up.headers {
		header.Set(hKey, hValue)
	}

	if up.upstreamAuth != nil {
		up.upstreamAuth.AddAuthentication(ctx, header, up.auth.scope)
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
