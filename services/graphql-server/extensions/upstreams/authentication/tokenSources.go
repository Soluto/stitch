package authentication

import (
	"net/url"

	"golang.org/x/net/context"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
)

func (ucc *upstreamClientCredentials) getOrCreateTokenSource(scope string) oauth2.TokenSource {
	if tokenSource, ok := ucc.tokenSources[scope]; ok {
		return tokenSource
	}

	tokenSource := createTokenSource(ucc, scope)
	ucc.tokenSources[scope] = tokenSource
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
