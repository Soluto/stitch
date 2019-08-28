package authentication

import (
	"context"
	"net/http"

	agogos "agogos/generated"
)

// UpstreamAuthentication interface for UpstreamAuthentication extension. Supplies auth details to HTTP request
type UpstreamAuthentication interface {
	AddAuthentication(ctx context.Context, req *http.Request, scope string)
}

type AuthMap map[string]map[string]UpstreamAuthentication

func (am AuthMap) Get(authType, authority string) UpstreamAuthentication {
	if authType == authTypeForwardHeader {
		return newForwardAuthHeader()
	}

	if m, ok := am[authType]; ok {
		return m[authority]
	} else {
		return nil
	}
}

func CreateUpstreamAuths(upsAuthConfigs []*agogos.UpstreamAuthCredentials) AuthMap {
	am := make(AuthMap)
	for _, upsAuthConfig := range upsAuthConfigs {
		if _, ok := am[upsAuthConfig.AuthType]; !ok {
			am[upsAuthConfig.AuthType] = make(map[string]UpstreamAuthentication)
		}

		am[upsAuthConfig.AuthType][upsAuthConfig.Authority] = newUpstreamClientCredentials(upsAuthConfig)
	}
	return am
}
