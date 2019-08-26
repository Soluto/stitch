package common

import (
	"agogos/directives/middlewares"
	"agogos/server"
	"context"

	"agogos/utils"

	"github.com/graphql-go/graphql"
	gqlclient "github.com/machinebox/graphql"
	"github.com/sirupsen/logrus"
	"github.com/vektah/gqlparser/ast"
)

type gqlParams struct {
	url       string
	queryName string
}

var gqlMiddleware = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(s server.ServerContext, f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		params := parseGqlParams(d)
		client := createGqlClient(params.url)

		return middlewares.ConcurrentLeaf(func(rp graphql.ResolveParams) (interface{}, error) {
			request, err := createGqlRequest(s, params, rp)
			if err != nil {
				return nil, err
			}

			return sendRequest(request, client, params)
		})
	},
}

func parseGqlParams(d *ast.Directive) gqlParams {
	params := gqlParams{}
	var ok bool

	arguments := d.ArgumentMap(make(map[string]interface{}))

	params.url, ok = arguments["url"].(string)
	if !ok {
		logrus.Panic("url argument is missing from gql directive")
	}

	params.queryName, ok = arguments["queryName"].(string)
	if !ok {
		logrus.Panic("queryName argument is missing from gql directive")
	}

	return params
}

func createGqlClient(url string) *gqlclient.Client {
	client := gqlclient.NewClient(url)
	return client
}

func createGqlRequest(s server.ServerContext, gqlParams gqlParams, rp graphql.ResolveParams) (*gqlclient.Request, error) {
	query := utils.ResolveParamsToSDLQuery(gqlParams.queryName, rp)
	request := gqlclient.NewRequest(query)
	return request, nil
}

func sendRequest(request *gqlclient.Request, client *gqlclient.Client, gqlParams gqlParams) (interface{}, error) {
	ctx := context.Background()
	var respData interface{}
	if err := client.Run(ctx, request, &respData); err != nil {
		logrus.WithError(err).Panic("error while graphql request")
	}
	result := respData.(map[string]interface{})[gqlParams.queryName]
	return result, nil
}
