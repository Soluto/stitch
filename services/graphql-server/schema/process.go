package schema

import (
	"agogos/extensions/upstreams"
	"agogos/extensions/upstreams/authentication"
	agogos "agogos/generated"
	"agogos/server"

	"github.com/graphql-go/graphql"
	log "github.com/sirupsen/logrus"
	"github.com/vektah/gqlparser"
	"github.com/vektah/gqlparser/ast"
)

func parseSdl(name, sdl string) (*ast.Schema, error) {
	schema, err := gqlparser.LoadSchema(&ast.Source{
		Name:  name,
		Input: sdl,
	})

	if err != nil {
		return nil, err
	}

	return schema, nil
}

func transformToSchema(config *agogos.ConfigurationMessage) (*graphql.Schema, error) {
	astSchema, err := parseSdl(
		"schema registry sdl",
		config.Schema.Definition,
	)
	if err != nil {
		log.WithError(err).WithField("schema", config.Schema.Definition).Warn("Error parsing SDL")
		return nil, err
	}

	upstreamsMap := createUpstreams(config.Upstreams, config.UpstreamAuthCredentials)
	serverContext := server.CreateServerContext(upstreamsMap)

	convertedSchema, err := convertSchema(serverContext, astSchema)
	if err != nil {
		log.WithError(err).Warn("Error converting schema")
		return nil, err
	}

	return convertedSchema, nil
}

func createUpstreams(upsConfigs []*agogos.Upstream, upsAuthConfigs []*agogos.UpstreamAuthCredentials) map[string]upstreams.Upstream {
	upsAuths := make(map[string]map[string]authentication.UpstreamAuthentication)
	for _, upsAuthConfig := range upsAuthConfigs {
		if _, ok := upsAuths[upsAuthConfig.AuthType]; !ok {
			upsAuths[upsAuthConfig.AuthType] = make(map[string]authentication.UpstreamAuthentication)
		}

		upsAuths[upsAuthConfig.AuthType][upsAuthConfig.Authority] = authentication.CreateFromConfig(upsAuthConfig)
	}

	ups := make(map[string]upstreams.Upstream, len(upsConfigs))

	for _, upConfig := range upsConfigs {
		var matchedUpsAuth authentication.UpstreamAuthentication
		if m, ok := upsAuths[upConfig.Auth.AuthType]; ok {
			if upsAuth, ok := m[upConfig.Auth.Authority]; ok {
				matchedUpsAuth = upsAuth
			}
		}

		ups[upConfig.Host] = upstreams.CreateFromConfig(upConfig, matchedUpsAuth)
	}

	return ups
}

type SchemaResult struct {
	Schema *graphql.Schema
	Error  error
}

func Process(configCh chan *agogos.ConfigurationMessage) chan SchemaResult {
	schemaCh := make(chan SchemaResult)

	go func() {
		defer close(schemaCh)

		for {
			config := <-configCh
			log.Infoln("Got new configuration from registry")
			schema, err := transformToSchema(config)
			schemaCh <- SchemaResult{
				Schema: schema,
				Error:  err,
			}
		}
	}()

	return schemaCh
}
