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

type RestParams struct {
	url         string
	method      string
	contentType string
	bodyArg     string
	query       NameValueList
	headers     NameValueList
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

var defaultContentType = contentTypes.JSON.name

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

func parseRestParams(directive *ast.Directive) RestParams {
	params := RestParams{}
	var ok bool

	args := directive.ArgumentMap(make(map[string]interface{}))

	params.url, ok = args["url"].(string)
	if !ok {
		logrus.Panic("url argument missing from rest directive")
	}

	params.method = getMethod(args)
	params.contentType = getContentTypeName(args)
	params.timeoutMs = getTimeout(args)
	params.bodyArg = getBodyArg(args)

	params.query = getNameValueList(args, "query")
	params.headers = getNameValueList(args, "headers")

	return params
}

func getContentTypeName(args map[string]interface{}) string {
	contentTypeName, ok := args["contentType"].(string)
	if !ok {
		return defaultContentType
	}

	contentType := getContentType(contentTypeName)
	return contentType.name
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

func getNameValueList(args map[string]interface{}, field string) NameValueList {
	fieldArgs, ok := args[field].([]interface{})
	if !ok {
		return nil
	}

	nameValueList := make(NameValueList, 0, len(fieldArgs))

	for _, arg := range fieldArgs {
		nameValuePair := arg.(map[string]interface{})
		nameValueList.append(nameValuePair["name"].(string), nameValuePair["value"].(string))
	}

	return nameValueList
}

func createHTTPClient(timeoutMs int) http.Client {
	timeoutNs := time.Millisecond.Nanoseconds() * int64(timeoutMs)
	return http.Client{Timeout: time.Duration(timeoutNs)}
}

func createHTTPRequest(serverCtx server.ServerContext, restParams RestParams, resolveParams graphql.ResolveParams) (*http.Request, error) {
	URL, err := getURL(restParams.url, restParams.query, resolveParams)
	if err != nil {
		return nil, err
	}

	bodyReader, err := getBodyReader(restParams, resolveParams)
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequest(restParams.method, URL, bodyReader)
	if err != nil {
		return nil, err
	}

	request = request.WithContext(resolveParams.Context)
	addHeadersToRequest(request, restParams, resolveParams)

	upstream, ok := serverCtx.Upstream(request.URL.Host)
	if ok {
		upstream.ApplyUpstream(resolveParams.Context, &request.Header)
	}

	return request, nil
}

func getURL(destURL string, queryParams NameValueList, resolveParams graphql.ResolveParams) (string, error) {
	mappedURL := utils.ReplaceWithParameters(resolveParams, destURL)
	urlObject, err := url.Parse(mappedURL)
	if err != nil {
		return "", err
	}

	addQueryParamsToURL(urlObject, queryParams, resolveParams)

	finalURL := urlObject.String()
	return finalURL, nil
}

func addQueryParamsToURL(urlObject *url.URL, queryParams NameValueList, resolveParams graphql.ResolveParams) {
	mappedQueryParams := queryParams.replaceParamsForQuery(resolveParams)
	urlQueryParams := urlObject.Query()

	for _, queryParam := range mappedQueryParams {
		urlQueryParams.Add(queryParam.name, queryParam.value)
	}

	urlObject.RawQuery = urlQueryParams.Encode()
}

func getBodyReader(restParams RestParams, resolveParams graphql.ResolveParams) (io.Reader, error) {
	if !isMethodWithBody(restParams.method) {
		return nil, nil
	}

	contentType := getContentType(restParams.contentType)
	inputBody := getBody(resolveParams.Args, restParams.bodyArg)

	inputBodyString, err := contentType.bodyHandler(inputBody)
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

func addHeadersToRequest(request *http.Request, restParams RestParams, resolveParams graphql.ResolveParams) {
	mappedHeaders := restParams.headers.replaceParams(resolveParams)
	for _, header := range mappedHeaders {
		request.Header.Set(header.name, header.value)
	}

	if isMethodWithBody(restParams.method) {
		contentType := getContentType(restParams.contentType)
		request.Header.Set("Content-Type", contentType.headerValue)
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
