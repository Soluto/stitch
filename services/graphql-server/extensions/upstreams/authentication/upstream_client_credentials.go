package authentication

import (
	"fmt"
	"net/http"

	"golang.org/x/net/context"

	"golang.org/x/oauth2/clientcredentials"

	gqlconfig "agogos/generated"
)

type upstreamClientCredentials struct {
	clientID     string
	clientSecret string
	scopes       []string
	authority    string
}

// AddAuthentication implements interface AuthProvider, adds Authorization header to HTTP request
func (ac *upstreamClientCredentials) AddAuthentication(req *http.Request) {
	conf := &clientcredentials.Config{
		ClientID:     ac.clientID,
		ClientSecret: ac.clientSecret,
		TokenURL:     ac.authority,
	}
	tok, err := conf.Token(context.Background())
	if err != nil {
		fmt.Printf("Failed to retrieve token from %s:\n %v", ac.authority, err)
		return
	}
	tok.SetAuthHeader(req)
}

func newUpstreamClientCredentials(apConfig *gqlconfig.UpstreamAuthCredentials) UpstreamAuthentication {
	return &upstreamClientCredentials{
		clientID:     apConfig.ClientId,
		clientSecret: apConfig.ClientSecret,
		authority:    apConfig.Authority,
	}
}
