package authentication

import (
	"log"
	"net/http"
	"net/url"

	"golang.org/x/net/context"

	"golang.org/x/oauth2/clientcredentials"

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
	conf := &clientcredentials.Config{
		ClientID:     ac.clientID,
		ClientSecret: ac.clientSecret,
		TokenURL:     ac.authority,
	}

	switch ac.authType {
	case "oauth2/client_credentials":
		conf.Scopes = []string{scope}
	case "activedirectory/client_credentials":
		conf.EndpointParams = url.Values{
			"resource": []string{scope},
		}
	}

	tok, err := conf.Token(context.Background())
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
