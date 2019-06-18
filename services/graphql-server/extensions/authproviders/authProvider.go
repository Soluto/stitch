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

var authProviders map[string](map[string]AuthProvider)

// Init initializes endpoint repository by
func Init(apConfigs []*gqlconfig.GqlAuthProvider) {
	authProviders = make(map[string]map[string]AuthProvider)
	for _, apConfig := range apConfigs {
		_, ok := authProviders[apConfig.AuthType]
		if !ok {
			authProviders[apConfig.AuthType] = make(map[string]AuthProvider)
		}
		authProviders[apConfig.AuthType][apConfig.Authority] = newAuthProvider(apConfig)
	}
}

// Get gets Endpoint by host
func Get(authType string, authority string) (AuthProvider, bool) {
	apsByType, ok := authProviders[authType]
	if ok {
		ap, ok := apsByType[authority]
		return ap, ok
	}
	return nil, ok
}
