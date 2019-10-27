package rest

import (
	"agogos/extensions/upstreams"
	"agogos/server"
	"agogos/utils"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser"
	"github.com/vektah/gqlparser/ast"
)

func TestParseRestParams(t *testing.T) {
	directiveFormat := `
		enum ContentTypes {
			json
		}

		input keyValue {
			key: String!
			value: String!
		}

		directive @rest(
			url: String!
			method: String
			contentType: ContentTypes
			bodyArg: String
			query: [keyValue!]
			headers: [keyValue!]
			timeoutMs: Int
		) on FIELD_DEFINITION

		type Query {
			some: String
			%s
		}
	`

	tests := []struct {
		name         string
		directive    string
		expected     restParams
		errorMessage string
	}{
		{
			"Should parse URL and default to GET method, json content-type, input bodyArg, and a 10 seconds timeout",
			`@rest(url: "some-url")`,
			restParams{
				url:         "some-url",
				method:      defaultMethod,
				contentType: defaultContentType,
				timeoutMs:   defaultTimeoutMs,
				bodyArg:     defaultBodyArg,
			},
			"",
		},
		{
			"Should panic on missing URL",
			`@rest()`,
			restParams{},
			"url argument missing from rest directive",
		},
		{
			"Should parse scalars",
			`@rest(url: "some-url", method: "SOME-METHOD", timeoutMs: 530, bodyArg: "custom-body-arg")`,
			restParams{
				url:         "some-url",
				method:      "SOME-METHOD",
				contentType: defaultContentType,
				timeoutMs:   530,
				bodyArg:     "custom-body-arg",
			},
			"",
		},
		{
			"Should default to json content-type when an unknown content-type is sent",
			`@rest(url: "some-url", contentType: "unknown-content-type")`,
			restParams{
				url:         "some-url",
				method:      defaultMethod,
				contentType: defaultContentType,
				timeoutMs:   defaultTimeoutMs,
				bodyArg:     defaultBodyArg,
			},
			"",
		},
		{
			"Converts method to uppercase",
			`@rest(url: "some-url", method: "post")`,
			restParams{
				url:         "some-url",
				method:      "POST",
				contentType: defaultContentType,
				timeoutMs:   defaultTimeoutMs,
				bodyArg:     defaultBodyArg,
			},
			"",
		},
		{
			"Should parse KeyValueLists",
			`@rest(
				url: "some-url",
				query: [
					{ key: "some-query-name1", value: "some-query-value1" },
					{ key: "some-query-name2", value: "some-query-value2" }
				],
				headers: [ { key: "some-header-name", value: "some-header-value"} ]
			)`,
			restParams{
				url:         "some-url",
				method:      defaultMethod,
				contentType: defaultContentType,
				timeoutMs:   defaultTimeoutMs,
				bodyArg:     defaultBodyArg,
				query: KeyValueList{
					keyValue{key: "some-query-name1", value: "some-query-value1"},
					keyValue{key: "some-query-name2", value: "some-query-value2"},
				},
				headers: KeyValueList{keyValue{key: "some-header-name", value: "some-header-value"}},
			},
			"",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			schema, err := gqlparser.LoadSchema(&ast.Source{
				Name:  "bla",
				Input: fmt.Sprintf(directiveFormat, test.directive),
			})

			if err != nil {
				t.Error(err)
				return
			}

			directive := schema.Types["Query"].Fields[0].Directives[0]

			if test.errorMessage == "" {
				// Act
				actual := parseRestParams(directive)

				// Assert
				assertEqual(t, actual, test.expected, "Parsing result did not match expectation")
			} else {
				// Act
				action := func() {
					parseRestParams(directive)
				}

				// Assert
				assertThrow(t, action, test.errorMessage, "Did not throw as expected")
			}
		})
	}
}

func TestGetURL(t *testing.T) {
	resolveParams := graphql.ResolveParams{
		Source: map[string]interface{}{"sourceParam": "fromSource"},
		Args:   map[string]interface{}{"argsParamForName": "nameFromArgs", "argsParamForValue": "valueFromArgs"},
	}
	inputURL := "http://some-url/{source.sourceParam}/some/path"
	queryParams := KeyValueList{keyValue{key: "got-{args.argsParamForName}", value: "{args.argsParamForValue}"}}

	expectedURL := "http://some-url/fromSource/some/path?got-nameFromArgs=valueFromArgs"

	result, err := getURL(inputURL, queryParams, resolveParams)
	if err != nil {
		t.Error(err)
		return
	}

	assertEqual(t, result, expectedURL, "Resulting URL from getUrl did not match expectations")
}

func TestCreateHTTPRequest(t *testing.T) {
	testContext := context.TODO()
	emptyServerContext := server.CreateServerContext(make(map[string]upstreams.Upstream))

	tests := []struct {
		name            string
		resolveParams   graphql.ResolveParams
		rstParams       restParams
		expectedURL     string
		expectedBody    interface{}
		expectedHeaders KeyValueList
	}{
		{
			"GET basic",
			graphql.ResolveParams{
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some",
			}),
			"http://some",
			nil,
			KeyValueList{},
		},
		{
			"GET with header",
			graphql.ResolveParams{
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some",
				headers: KeyValueList{
					keyValue{"some-header-name", "some-value"},
				},
			}),
			"http://some",
			nil,
			KeyValueList{
				keyValue{"Some-Header-Name", "some-value"},
			},
		},
		{
			"GET with header using param replacement",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"someArg":          "some-arg-value",
					"headerNameSuffix": "header-name",
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some",
				headers: KeyValueList{
					keyValue{"some-{args.headerNameSuffix}", "{args.someArg}"},
				},
			}),
			"http://some",
			nil,
			KeyValueList{
				keyValue{"Some-Header-Name", "some-arg-value"},
			},
		},
		{
			"Get with param replacement in url",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id": "100",
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some/{args.id}",
			}),
			"http://some/100",
			nil,
			KeyValueList{},
		},
		{
			"Get with url using param replacement from source",
			graphql.ResolveParams{
				Source: map[string]interface{}{
					"id": "100",
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some/{source.id}",
			}),
			"http://some/100",
			nil,
			KeyValueList{},
		},
		{
			"Get with param replacement in querystring",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id": "100",
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some?a={args.id}",
			}),
			"http://some?a=100",
			nil,
			KeyValueList{},
		},
		{
			"Get with param replacement in url and querystring",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id":        "100",
					"firstName": "dude",
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some/{args.id}?name={args.firstName}",
			}),
			"http://some/100?name=dude",
			nil,
			KeyValueList{},
		},
		{
			"Get with query using param replacement",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id":        "100",
					"text":      "and escape!",
					"idArgName": "a",
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some",
				query: KeyValueList{
					keyValue{
						key: "{args.idArgName}", value: "{args.id}",
					},
					keyValue{
						key: "txt", value: "{args.text}",
					},
				},
			}),
			"http://some?a=100&txt=and+escape%21",
			nil,
			KeyValueList{},
		},
		{
			"Get with url and query both using param replacement",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id":     "100",
					"entity": "user",
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some/{args.entity}",
				query: KeyValueList{
					keyValue{
						key: "a", value: "{args.id}",
					},
				},
			}),
			"http://some/user?a=100",
			nil,
			KeyValueList{},
		},
		{
			"Get with url, query and querystring all using param replacement",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id":        "100",
					"entity":    "user",
					"firstName": "dude",
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some/{args.entity}?name={args.firstName}",
				query: KeyValueList{
					keyValue{
						key: "a", value: "{args.id}",
					},
				},
			}),
			"http://some/user?a=100&name=dude",
			nil,
			KeyValueList{},
		},
		{
			"Post basic",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"input": map[string]interface{}{
						"data": "asdasd",
					},
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url:         "http://some",
				method:      "POST",
				contentType: getContentType("json"),
			}),
			"http://some",
			map[string]interface{}{
				"data": "asdasd",
			},
			KeyValueList{
				keyValue{"Content-Type", "application/json"},
			},
		},
		{
			"Post with non default body arg",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"customBodyArg": map[string]interface{}{
						"data": "asdasd",
					},
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url:         "http://some",
				method:      "POST",
				contentType: getContentType("json"),
				bodyArg:     "customBodyArg",
			}),
			"http://some",
			map[string]interface{}{
				"data": "asdasd",
			},
			KeyValueList{
				keyValue{"Content-Type", "application/json"},
			},
		},
		{
			"Post with param replacement in body",
			graphql.ResolveParams{
				Source: map[string]interface{}{
					"someSourceParam": "some-value",
				},
				Args: map[string]interface{}{
					"input": map[string]interface{}{
						"some-body-param": "{source.someSourceParam}",
					},
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url:         "http://some",
				method:      "POST",
				contentType: getContentType("json"),
			}),
			"http://some",
			map[string]interface{}{
				"some-body-param": "some-value",
			},
			KeyValueList{
				keyValue{"Content-Type", "application/json"},
			},
		},
		{
			"Post with non default body arg and param replacement in body",
			graphql.ResolveParams{
				Source: map[string]interface{}{
					"someSourceParam": "some-source-value",
				},
				Args: map[string]interface{}{
					"bodyHere": map[string]interface{}{
						"some-arg":                 "some-arg-value",
						"{source.someSourceParam}": "the value",
					},
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url:     "http://some",
				method:  "POST",
				bodyArg: "bodyHere",
			}),
			"http://some",
			map[string]interface{}{
				"some-source-value": "the value",
				"some-arg":          "some-arg-value",
			},
			KeyValueList{
				keyValue{"Content-Type", "application/json"},
			},
		},
		{
			"Non-string query",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"int":   100,
					"arr":   []interface{}{"a", 3},
					"bool":  true,
					"float": 123.2,
				},
				Context: testContext,
			},
			restParamsWithDefaults(restParams{
				url: "http://some/",
				query: KeyValueList{
					keyValue{"int", "{args.int}"},
					keyValue{"arr", "{args.arr}"},
					keyValue{"bool", "{args.bool}"},
					keyValue{"float", "{args.float}"},
				},
			}),
			"http://some/?arr=a&arr=3&bool=true&float=123.2&int=100",
			nil,
			KeyValueList{},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			headers := make(http.Header)
			for _, header := range test.expectedHeaders {
				headers[header.key] = []string{header.value}
			}

			// Act
			request, err := createHTTPRequest(emptyServerContext, test.rstParams, test.resolveParams)

			// Assert
			if err != nil {
				t.Error("Unexpected createHTTPRequest error", err)
			}

			assertEqual(t, test.expectedURL, fmt.Sprint(request.URL), "url incorrect")

			assertEqual(t, headers, request.Header, "headers incorrect")

			assertEqual(t, request.Context(), testContext, "bad context propagation")

			if test.expectedBody == nil {
				assert(t, request.GetBody == nil, "body should be nil")
				return
			}

			assert(t, request.GetBody != nil, "body should not be nil")

			body, err := request.GetBody()

			if err != nil {
				t.Error("Unexpected GetBody error", err)
			}

			buffer, err := ioutil.ReadAll(body)
			if err != nil {
				t.Error("Unexpected ReadAll error", err)
			}

			var result interface{}

			err = json.Unmarshal(buffer, &result)
			if err != nil {
				t.Error("Unexpected Unmarshal error", err)
			}

			assertEqual(t, test.expectedBody, result, "body incorrect")
		})
	}
}

// Utils /////////////

func assertEqual(t *testing.T, expected interface{}, actual interface{}, fromat string, args ...interface{}) {
	contentTypeDataComparer := func(a contentTypeData, b contentTypeData) bool { return a.headerValue == b.headerValue }
	cmpOptions := cmp.Options{
		cmp.AllowUnexported(restParams{}, keyValue{}, contentTypeData{}),
		cmp.Comparer(contentTypeDataComparer),
	}

	b := cmp.Equal(expected, actual, cmpOptions)
	if !b {
		fmt.Println("diff", cmp.Diff(expected, actual, cmpOptions))
		t.Errorf(fromat, args...)
	}
}

func assertThrow(t *testing.T, f func(), errorMessage string, format string, args ...interface{}) {
	err := func() (err error) {
		defer utils.Recovery(&err)
		f()
		return
	}()

	if err != nil {
		assert(t, err.Error() == errorMessage, format, args...)
	} else {
		t.Errorf(format, args...)
	}
}

func assert(t *testing.T, b bool, fromat string, args ...interface{}) {
	if !b {
		t.Errorf(fromat, args...)
	}
}

func restParamsWithDefaults(rstParams restParams) restParams {
	if rstParams.method == "" {
		rstParams.method = defaultMethod
	}

	if rstParams.contentType.headerValue == "" {
		rstParams.contentType = defaultContentType
	}

	if rstParams.bodyArg == "" {
		rstParams.bodyArg = defaultBodyArg
	}

	if rstParams.timeoutMs == 0 {
		rstParams.timeoutMs = defaultTimeoutMs
	}

	return rstParams
}
