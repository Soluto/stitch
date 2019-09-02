package common

import (
	"agogos/directives/middlewares"
	"agogos/server"
	"net/url"
	"reflect"

	"agogos/extensions/upstreams"
	"agogos/utils"

	"github.com/graphql-go/graphql"
	gqlclient "github.com/machinebox/graphql"
	"github.com/sirupsen/logrus"
	"github.com/vektah/gqlparser/ast"
)

type gqlParams struct {
	url       *url.URL
	urlStr    string
	upstream  upstreams.Upstream
	queryName string
	args      string
}

var gqlMiddleware = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(s server.ServerContext, f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		params := parseGqlParams(d, s)
		client := createGqlClient(params.urlStr)

		return middlewares.ConcurrentLeaf(func(rp graphql.ResolveParams) (interface{}, error) {
			request, err := createGqlRequest(s, params, rp)
			if err != nil {
				return nil, err
			}

			return sendRequest(s, request, client, params)
		})
	},
}

func parseGqlParams(d *ast.Directive, s server.ServerContext) gqlParams {
	params := gqlParams{}
	var ok bool
	var err error

	arguments := d.ArgumentMap(make(map[string]interface{}))

	params.urlStr, ok = arguments["url"].(string)
	if !ok {
		logrus.Panic("url argument is missing from gql directive")
	}

	params.url, err = url.Parse(params.urlStr)
	if err != nil {
		logrus.Panic("url argument in gql directive is invalid")
	}

	params.queryName, ok = arguments["queryName"].(string)
	if !ok {
		logrus.Panic("queryName argument is missing from gql directive")
	}

	params.upstream, ok = s.Upstream(params.url.Host)
	if !ok {
		params.upstream = nil
	}

	params.args = arguments["arguments"].(string)

	return params
}

func createGqlClient(url string) *gqlclient.Client {
	client := gqlclient.NewClient(url)
	return client
}

func createGqlRequest(s server.ServerContext, gqlParams gqlParams, rp graphql.ResolveParams) (*gqlclient.Request, error) {
	query := utils.ResolveParamsToSDLQuery(gqlParams.queryName, rp, gqlParams.args)
	request := gqlclient.NewRequest(query)

	if gqlParams.upstream != nil {
		gqlParams.upstream.ApplyUpstream(rp.Context, &request.Header)
	}
	return request, nil
}

func sendRequest(ctx server.ServerContext, request *gqlclient.Request, client *gqlclient.Client, gqlParams gqlParams) (interface{}, error) {
	var respData interface{}
	if err := client.Run(ctx, request, &respData); err != nil {
		logrus.WithError(err).Error("error while graphql request")
		return nil, err
	}
	responseBody, ok := respData.(map[string]interface{})
	if !ok {
		logrus.WithField("response_body_type", reflect.TypeOf(respData)).Panic("Gql query call returned response with invalid body type")
	}
	result := responseBody[gqlParams.queryName]
	return result, nil
}
