package authproviders

import (
	"net/http"

	gqlconfig "agogos/generated"
)

// AuthProvider interface for AuthProvider extension. Supplies auth details to HTTP request
type UpstreamAuthentication interface {
	AddAuthentication(req *http.Request)
}

func newUpstreamAuthentication(apConfig *gqlconfig.UpstreamAuthCredentials) UpstreamAuthentication {
	// TODO: add more generic approach with addition of new types
	return newUpstreamClientCredentials(apConfig)
}

var upstreamAuthentications map[string](map[string]UpstreamAuthentication)

// Init initializes endpoint repository by
func Init(apConfigs []*gqlconfig.UpstreamAuthCredentials) {
	upstreamAuthentications = make(map[string]map[string]UpstreamAuthentication)
	for _, apConfig := range apConfigs {
		_, ok := upstreamAuthentications[apConfig.AuthType]
		if !ok {
			upstreamAuthentications[apConfig.AuthType] = make(map[string]UpstreamAuthentication)
		}
		upstreamAuthentications[apConfig.AuthType][apConfig.Authority] = newUpstreamAuthentication(apConfig)
	}
}

// Get gets Endpoint by host
func Get(authType string, authority string) (UpstreamAuthentication, bool) {
	apsByType, ok := upstreamAuthentications[authType]
	if ok {
		ap, ok := apsByType[authority]
		return ap, ok
	}
	return nil, ok
}
