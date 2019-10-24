package rest

import (
	"agogos/directives/middlewares"
	"agogos/server"
	"agogos/utils"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/sirupsen/logrus"
	"github.com/vektah/gqlparser/ast"
)

type restParams struct {
	url         string
	method      string
	contentType contentTypeData
	bodyArg     string
	query       KeyValueList
	headers     KeyValueList
	timeoutMs   int
}

type httpClient interface {
	Do(*http.Request) (*http.Response, error)
}

const (
	defaultTimeoutMs = 10000
	defaultMethod    = "GET"
	defaultBodyArg   = "input"
)

var RestMiddleware = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(serverCtx server.ServerContext, fieldDef *ast.FieldDefinition, directive *ast.Directive) middlewares.Middleware {
		params := parseRestParams(directive)
		client := createHTTPClient(params.timeoutMs)

		return middlewares.ConcurrentLeaf(func(resolveParams graphql.ResolveParams) (interface{}, error) {
			request, err := createHTTPRequest(serverCtx, params, resolveParams)
			if err != nil {
				return nil, err
			}

			return sendHTTPRequest(request, &client)
		})
	},
}

func parseRestParams(directive *ast.Directive) restParams {
	rstParams := restParams{}
	var ok bool

	args := directive.ArgumentMap(make(map[string]interface{}))

	rstParams.url, ok = args["url"].(string)
	if !ok {
		logrus.Panic("url argument missing from rest directive")
	}

	rstParams.method = getMethod(args)
	rstParams.contentType = getContentTypeFromArgs(args)
	rstParams.timeoutMs = getTimeout(args)
	rstParams.bodyArg = getBodyArg(args)

	rstParams.query = getKeyValueList(args, "query")
	rstParams.headers = getKeyValueList(args, "headers")

	return rstParams
}

func getContentTypeFromArgs(args map[string]interface{}) contentTypeData {
	contentTypeName, ok := args["contentType"].(string)
	if !ok {
		return defaultContentType
	}

	return getContentType(contentTypeName)
}

func getTimeout(args map[string]interface{}) int {
	timeoutInt64, ok := args["timeoutMs"].(int64)
	if ok {
		return int(timeoutInt64)
	}

	timeout, ok := args["timeoutMs"].(int)
	if !ok {
		return defaultTimeoutMs
	}

	return timeout
}

func getMethod(args map[string]interface{}) string {
	method, ok := args["method"].(string)
	if !ok {
		return defaultMethod
	}

	return strings.ToUpper(method)
}

func getBodyArg(args map[string]interface{}) string {
	bodyArg, ok := args["bodyArg"].(string)
	if !ok {
		return defaultBodyArg
	}

	return bodyArg
}

func getKeyValueList(args map[string]interface{}, field string) KeyValueList {
	fieldArgs, ok := args[field].([]interface{})
	if !ok {
		return nil
	}

	keyValueList := make(KeyValueList, 0, len(fieldArgs))

	for _, arg := range fieldArgs {
		keyValuePair := arg.(map[string]interface{})
		keyValueList.append(keyValuePair["key"].(string), keyValuePair["value"].(string))
	}

	return keyValueList
}

func createHTTPClient(timeoutMs int) http.Client {
	timeoutNs := time.Millisecond.Nanoseconds() * int64(timeoutMs)
	return http.Client{Timeout: time.Duration(timeoutNs)}
}

func createHTTPRequest(serverCtx server.ServerContext, rstParams restParams, resolveParams graphql.ResolveParams) (*http.Request, error) {
	URL, err := getURL(rstParams.url, rstParams.query, resolveParams)
	if err != nil {
		return nil, err
	}

	bodyReader, err := getBodyReader(rstParams, resolveParams)
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequest(rstParams.method, URL, bodyReader)
	if err != nil {
		return nil, err
	}

	request = request.WithContext(resolveParams.Context)
	addHeadersToRequest(request, rstParams, resolveParams)

	upstream, ok := serverCtx.Upstream(request.URL.Host)
	if ok {
		upstream.ApplyUpstream(resolveParams.Context, &request.Header)
	}

	return request, nil
}

func getURL(destURL string, queryParams KeyValueList, resolveParams graphql.ResolveParams) (string, error) {
	mappedURL := utils.ReplaceWithParameters(resolveParams, destURL)
	urlObject, err := url.Parse(mappedURL)
	if err != nil {
		return "", err
	}

	urlObject.RawQuery = getQuerystring(urlObject.Query(), queryParams, resolveParams)

	finalURL := urlObject.String()
	return finalURL, nil
}

func getQuerystring(urlQueryParams url.Values, queryParams KeyValueList, resolveParams graphql.ResolveParams) string {
	mappedQueryParams := queryParams.replaceParamsForQuery(resolveParams)

	for _, queryParam := range mappedQueryParams {
		urlQueryParams.Add(queryParam.key, queryParam.value)
	}

	return urlQueryParams.Encode()
}

func getBodyReader(rstParams restParams, resolveParams graphql.ResolveParams) (io.Reader, error) {
	if !isMethodWithBody(rstParams.method) {
		return nil, nil
	}

	inputBody := getBody(resolveParams.Args, rstParams.bodyArg)
	inputBodyString, err := rstParams.contentType.serializer(inputBody)
	if err != nil {
		return nil, err
	}

	body := utils.ReplaceWithParameters(resolveParams, inputBodyString)
	return strings.NewReader(body), nil
}

func isMethodWithBody(method string) bool {
	return method != "GET"
}

func getBody(args map[string]interface{}, bodyArg string) (body map[string]interface{}) {
	body, ok := args[bodyArg].(map[string]interface{})
	if !ok {
		body = make(map[string]interface{})
	}

	return
}

func addHeadersToRequest(request *http.Request, rstParams restParams, resolveParams graphql.ResolveParams) {
	mappedHeaders := rstParams.headers.replaceParams(resolveParams)
	for _, header := range mappedHeaders {
		request.Header.Set(header.key, header.value)
	}

	if isMethodWithBody(rstParams.method) {
		request.Header.Set("Content-Type", rstParams.contentType.headerValue)
	}
}

func sendHTTPRequest(request *http.Request, client httpClient) (interface{}, error) {
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	buffer, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	if response.StatusCode == 404 {
		return nil, nil
	}
	if response.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP Error. StatusCode=%v, Host=%v, ResponseBody=%v", response.StatusCode, request.Host, string(buffer))
	}

	var result interface{}

	err = json.Unmarshal(buffer, &result)
	if err != nil {
		return nil, err
	}

	return result, nil
}
