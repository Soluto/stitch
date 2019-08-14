package authentication

import (
	"net/http"

	agogos "agogos/generated"
)

// UpstreamAuthentication interface for UpstreamAuthentication extension. Supplies auth details to HTTP request
type UpstreamAuthentication interface {
	AddAuthentication(req *http.Request, scope string)
}

var upstreamAuthentications map[string](map[string]UpstreamAuthentication)

// Init initialises upstream repository by config
func Init(apConfigs []*agogos.UpstreamAuthCredentials) {
	upstreamAuthentications = make(map[string]map[string]UpstreamAuthentication)
	for _, apConfig := range apConfigs {
		_, ok := upstreamAuthentications[apConfig.AuthType]
		if !ok {
			upstreamAuthentications[apConfig.AuthType] = make(map[string]UpstreamAuthentication)
		}
		upstreamAuthentications[apConfig.AuthType][apConfig.Authority] = From(apConfig)
	}
}

// Get gets UpstreamAuthentication by authType and authority
func Get(authType string, authority string) (UpstreamAuthentication, bool) {
	apsByType, ok := upstreamAuthentications[authType]
	if ok {
		ap, ok := apsByType[authority]
		return ap, ok
	}
	return nil, ok
}

func From(uac *agogos.UpstreamAuthCredentials) UpstreamAuthentication {
	return newUpstreamClientCredentials(uac)
}
