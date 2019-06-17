package endpoints

import (
	"net/http"

	authproviders "agogos/extensions/authproviders"
	gqlconfig "agogos/generated"
)

// Endpoint - interface for endpoint extension. Allows to change @http directive url or to add headers to http request created in resolver
type Endpoint interface {
	ApplyEndpoint(req *http.Request)
}

type endpointStruct struct {
	host    string
	headers map[string]string
	auth    authStruct
}

type authStruct struct {
	authType  string
	authority string
	scope     string
}

func (ep *endpointStruct) ApplyEndpoint(req *http.Request) {
	for header, headerValue := range ep.headers {
		req.Header.Set(header, headerValue)
	}

	// TODO: consider more implicit approach
	ap, ok := authproviders.Get(ep.auth.authority)
	if ok {
		ap.AddAuthentication(req)
	}
}

func newEndpoint(epConfig *gqlconfig.GqlEndpoint) Endpoint {
	return &endpointStruct{
		host: epConfig.Host,
		auth: authStruct{
			authority: epConfig.Auth.Authority,
			scope:     epConfig.Auth.Scope,
		},
	}
}

var endpoints map[string]Endpoint

// Init initializes endpoint repository by
func Init(epConfigs []*gqlconfig.GqlEndpoint) {
	endpoints = make(map[string]Endpoint)
	for _, epConfig := range epConfigs {
		endpoints[epConfig.Host] = newEndpoint(epConfig)
	}
}

// Get gets Endpoint by host
func Get(host string) (Endpoint, bool) {
	ep, ok := endpoints[host]
	return ep, ok
}
