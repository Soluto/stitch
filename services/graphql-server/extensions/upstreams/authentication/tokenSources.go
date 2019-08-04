package authentication

import (
	"fmt"
	"net/url"

	"golang.org/x/net/context"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
)

var tokenSources = make(map[string]oauth2.TokenSource)

func hashConfig(ucc *upstreamClientCredentials, scope string) string {
	return fmt.Sprintf("%s:%s:%s:%s:%s", ucc.authType, ucc.authority, ucc.clientID, ucc.clientSecret, scope)
}

func (ucc *upstreamClientCredentials) getOrCreateTokenSource(scope string) oauth2.TokenSource {
	id := hashConfig(ucc, scope)

	if tokenSource, ok := tokenSources[id]; ok {
		return tokenSource
	}

	tokenSource := createTokenSource(ucc, scope)
	tokenSources[id] = tokenSource
	return tokenSource
}

func createTokenSource(ucc *upstreamClientCredentials, scope string) oauth2.TokenSource {
	conf := &clientcredentials.Config{
		ClientID:     ucc.clientID,
		ClientSecret: ucc.clientSecret,
		TokenURL:     ucc.authority,
	}

	switch ucc.authType {
	case "oauth2/client_credentials":
		conf.Scopes = []string{scope}
	case "activedirectory/client_credentials":
		conf.EndpointParams = url.Values{
			"resource": []string{scope},
		}
	}

	return conf.TokenSource(context.Background())
}
