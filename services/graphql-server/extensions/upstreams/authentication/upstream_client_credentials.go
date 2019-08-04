package authentication

import (
	"log"
	"net/http"

	gqlconfig "agogos/generated"
)

type upstreamClientCredentials struct {
	authType     string
	clientID     string
	clientSecret string
	authority    string
}

// AddAuthentication implements interface AuthProvider, adds Authorization header to HTTP request
func (ac *upstreamClientCredentials) AddAuthentication(req *http.Request, scope string) {
	tokenSource := ac.getOrCreateTokenSource(scope)
	tok, err := tokenSource.Token()

	if err != nil {
		log.Printf("Failed to retrieve token from %s:\n %v", ac.authority, err)
		return
	}

	tok.SetAuthHeader(req)
}

func newUpstreamClientCredentials(apConfig *gqlconfig.UpstreamAuthCredentials) UpstreamAuthentication {
	return &upstreamClientCredentials{
		authType:     apConfig.AuthType,
		clientID:     apConfig.ClientId,
		clientSecret: apConfig.ClientSecret,
		authority:    apConfig.Authority,
	}
}
