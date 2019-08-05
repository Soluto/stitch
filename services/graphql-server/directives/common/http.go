package common

import (
	"agogos/directives/middlewares"
	upstreams "agogos/extensions/upstreams"
	"agogos/utils"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
	"github.com/sirupsen/logrus"
)

type httpParams struct {
	templateURL string
	method      string
	contentType string
	queryParams []nameValue
	bodyParams  []nameValue
	timeout     int
	headers     []nameValue
}

type nameValue struct {
	name  string
	value string
}

type dictionary = map[string]interface{}

type httpClient interface {
	Do(*http.Request) (*http.Response, error)
}

var httpMiddleware = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		params := parseHTTPParams(d)
		client := createHTTPClient(params.timeout)
		return middlewares.Leaf(func(rp graphql.ResolveParams) (interface{}, error) {
			request, err := createHTTPRequest(params, rp)
			if err != nil {
				return nil, err
			}

			return doHTTP(request, &client)
		})
	},
}

func parseHTTPParams(d *ast.Directive) httpParams {
	params := httpParams{}
	var ok bool

	arguments := d.ArgumentMap(make(map[string]interface{}))

	params.templateURL, ok = arguments["url"].(string)

	if !ok {
		logrus.Panic("url argument missing from http directive")
	}

	params.method, ok = arguments["method"].(string)

	if !ok {
		params.method = "GET"
	}

	params.contentType, ok = arguments["contentType"].(string)

	if !ok {
		params.contentType = "json"
	}

	timeout, ok := arguments["timeout"].(int)

	if ok {
		params.timeout = timeout
	}

	toNameValueList := func(args []interface{}) []nameValue {
		nameValueList := make([]nameValue, 0, len(args))

		for _, a := range args {
			m := a.(map[string]interface{})

			nameValueList = append(nameValueList, nameValue{
				name:  m["name"].(string),
				value: m["value"].(string),
			})
		}

		return nameValueList
	}

	query, ok := arguments["query"].([]interface{})

	if ok {
		params.queryParams = toNameValueList(query)
	}

	body, ok := arguments["body"].([]interface{})

	if ok {
		params.bodyParams = toNameValueList(body)
	}

	headers, ok := arguments["headers"].([]interface{})

	if ok {
		params.headers = toNameValueList(headers)
	}

	return params
}

func createHTTPClient(timeout int) http.Client {
	return http.Client{
		Timeout: time.Duration(timeout),
	}
}

func createHTTPRequest(p httpParams, rp graphql.ResolveParams) (*http.Request, error) {
	args, input, source := getArgs(rp)

	URL := getURL(p.templateURL, p.queryParams, args, input, source)

	var reader io.Reader
	var err error

	if p.method != "GET" && p.contentType == "json" {
		reader, err = getReader(p.bodyParams, args, input, source)
		if err != nil {
			return nil, err
		}
	}

	request, err := http.NewRequest(p.method, URL, reader)
	if err != nil {
		return nil, err
	}

	for _, h := range p.headers {
		request.Header.Set(h.name, replace(h.value, args, input, source))
	}

	if p.method != "GET" && p.contentType == "json" {
		request.Header.Set("Content-Type", "application/json")
	}

	// TODO: Make upstreams not connected directly to specific directive
	ep, ok := upstreams.Get(request.URL.Host)
	if ok {
		ep.ApplyUpstream(request)
	}

	return request, nil
}

func doHTTP(request *http.Request, client httpClient) (interface{}, error) {
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

func getArgs(g graphql.ResolveParams) (args dictionary, input dictionary, source dictionary) {
	args = g.Args
	input, ok := args["input"].(map[string]interface{})

	if !ok {
		input = make(map[string]interface{})
	}

	source, ok = g.Source.(map[string]interface{})

	return
}

func getURL(templateURL string, queryParams []nameValue, args dictionary, input dictionary, source dictionary) string {
	path := replace(templateURL, args, input, source)

	mappedQueryParams := make([]string, 0, len(queryParams))

	for _, nv := range queryParams {
		if p := args[nv.value]; p != nil && p != "" {
			mappedQueryParams = append(mappedQueryParams, fmt.Sprintf("%s=%s", nv.name, p))
		}
	}

	if len(mappedQueryParams) == 0 {
		return path
	}

	query := strings.Join(mappedQueryParams, "&")

	if strings.Contains(path, "?") {
		return fmt.Sprintf("%s&%s", path, query)
	}

	return fmt.Sprintf("%s?%s", path, query)
}

func getReader(bodyParams []nameValue, args dictionary, input dictionary, source dictionary) (io.Reader, error) {
	body := make(map[string]interface{})

	for k, v := range input {
		body[k] = v
	}

	for _, bp := range bodyParams {
		body[bp.name] = replace(bp.value, args, input, source)
	}

	bodyJSON, err := json.Marshal(body)

	if err != nil {
		return nil, err
	}

	return bytes.NewReader(bodyJSON), nil
}

var placeholderRegex = regexp.MustCompile(`:([^0-9/&?]+)`)

func replace(t string, dictionaries ...dictionary) string {
	return utils.ReplaceAllStringSubmatchFunc(placeholderRegex, t, func(k []string) string {
		key := k[1]

		for _, d := range dictionaries {
			val, ok := d[key]

			if ok {
				return fmt.Sprint(val)
			}
		}

		return ""
	})
}
