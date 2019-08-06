package authentication

import (
	"fmt"
	"net/http"

	log "github.com/sirupsen/logrus"

	gqlconfig "agogos/generated"

	"golang.org/x/oauth2"
)

type upstreamClientCredentials struct {
	authType     string
	clientID     string
	clientSecret string
	authority    string
	tokenSources map[string]oauth2.TokenSource
}

// AddAuthentication implements interface AuthProvider, adds Authorization header to HTTP request
func (ucc *upstreamClientCredentials) AddAuthentication(req *http.Request, scope string) {
	tokenSource := ucc.getOrCreateTokenSource(scope)
	tok, err := tokenSource.Token()

	if err != nil {
		log.WithField("error", err).Error(fmt.Sprintf("Failed to retrieve token from %s", ucc.authority))
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
		tokenSources: make(map[string]oauth2.TokenSource),
	}
}
