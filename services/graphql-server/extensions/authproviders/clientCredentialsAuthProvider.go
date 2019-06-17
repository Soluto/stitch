package authproviders

import (
	"log"
	"net/http"

	"golang.org/x/net/context"

	"golang.org/x/oauth2/clientcredentials"

	gqlconfig "agogos/generated"
)

type clientCredentialsAuthProvider struct {
	clientID     string
	clientSecret string
	scopes       []string
	authority    string
}

// AddAuthentication implements interface AuthProvider, adds Authorization header to HTTP request
func (ap *clientCredentialsAuthProvider) AddAuthentication(req *http.Request) {
	conf := &clientcredentials.Config{
		ClientID:     ap.clientID,
		ClientSecret: ap.clientSecret,
		TokenURL:     ap.authority,
	}
	tok, err := conf.Token(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	tok.SetAuthHeader(req)
}

func newClientCredentialsAuthProvider(apConfig *gqlconfig.GqlAuthProvider) AuthProvider {
	return &clientCredentialsAuthProvider{
		clientID:     apConfig.ClientId,
		clientSecret: apConfig.ClientSecret,
		authority:    apConfig.Authority,
	}
}
