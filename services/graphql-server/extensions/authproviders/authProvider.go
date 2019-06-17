package authproviders

import (
	"net/http"

	gqlconfig "agogos/generated"
)

// AuthProvider interface for AuthProvider extension. Supplies auth details to HTTP request
type AuthProvider interface {
	AddAuthentication(req *http.Request)
}

func newAuthProvider(apConfig *gqlconfig.GqlAuthProvider) AuthProvider {
	// TODO: add more generic approach with addition of new types
	return newClientCredentialsAuthProvider(apConfig)
}

var authProviders map[string]AuthProvider

// Init initializes endpoint repository by
func Init(apConfigs []*gqlconfig.GqlAuthProvider) {
	authProviders = make(map[string]AuthProvider)
	for _, apConfig := range apConfigs {
		authProviders[apConfig.Authority] = newAuthProvider(apConfig)
	}
}

// Get gets Endpoint by host
func Get(authority string) (AuthProvider, bool) {
	ap, ok := authProviders[authority]
	return ap, ok
}
