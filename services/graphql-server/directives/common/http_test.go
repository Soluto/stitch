package common

import (
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

func TestParseHTTPParams(t *testing.T) {
	directiveFormat := `
	input HttpNameValue {
		name: String!
		value: String!
	}

	directive @http(
		url: String!
		method: String
		contentType: String
		query: [HttpNameValue!]
		body: [HttpNameValue!]
		timeout: Int
		headers: [HttpNameValue!]
	) on FIELD_DEFINITION
	
	type Query {
		some: String
		%s
	}`

	tests := []struct {
		name         string
		directive    string
		expected     httpParams
		errorMessage string
	}{
		{
			"Should parse URL",
			`@http(url: "some-url")`,
			httpParams{
				templateURL: "some-url",
				method:      "GET",
				contentType: "json",
			},
			"",
		},
		{
			"Should panic on missing URL",
			`@http()`,
			httpParams{},
			"url argument missing from http directive",
		},
		{
			"Should parse scalars",
			`@http(url: "some-url", method:"some-method", contentType: "some-content-type")`,
			httpParams{
				templateURL: "some-url",
				method:      "some-method",
				contentType: "some-content-type",
			},
			"",
		},
		{
			"Should parse name-value lists",
			`@http(url: "some-url", 
				query: [{name: "some-query-name", value: "some-query-value"}], 
				body: [{name: "some-body-name", value: "some-body-value"}], 
				headers: [{name: "some-header-name", value: "some-header-value"}])`,
			httpParams{
				templateURL: "some-url",
				method:      "GET",
				contentType: "json",
				queryParams: []nameValue{
					nameValue{
						"some-query-name",
						"some-query-value",
					},
				},
				bodyParams: []nameValue{
					nameValue{
						"some-body-name",
						"some-body-value",
					},
				},
				headers: []nameValue{
					nameValue{
						"some-header-name",
						"some-header-value",
					},
				},
			},
			"",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
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
				actual := parseHTTPParams(directive)

				// Assert
				assertEqual(t, actual, test.expected, "Parsing result did not match expectation")
			} else {
				// Act
				action := func() {
					parseHTTPParams(directive)
				}

				// Assert
				assertThrow(t, action, test.errorMessage, "Did not throw as expected")
			}
		})
	}
}

func TestCreateHTTPRequest(t *testing.T) {
	testContext := context.TODO()
	tests := []struct {
		name            string
		rp              graphql.ResolveParams
		hp              httpParams
		expectedURL     string
		expectedBody    interface{}
		expectedHeaders []nameValue
	}{
		{
			"GET basic",
			graphql.ResolveParams{
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some",
			},
			"http://some",
			nil,
			[]nameValue{},
		},
		{
			"GET with header",
			graphql.ResolveParams{
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some",
				headers: []nameValue{
					nameValue{"some-header-name", "some-value"},
				},
			},
			"http://some",
			nil,
			[]nameValue{
				nameValue{"Some-Header-Name", "some-value"},
			},
		},
		{
			"GET with header from placeholder",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"someArg": "some-arg-value",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some",
				headers: []nameValue{
					nameValue{"some-header-name", ":someArg"},
				},
			},
			"http://some",
			nil,
			[]nameValue{
				nameValue{"Some-Header-Name", "some-arg-value"},
			},
		},
		{
			"Get with template path param",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id": "100",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some/:id",
			},
			"http://some/100",
			nil,
			[]nameValue{},
		},
		{
			"Get with template path param from source",
			graphql.ResolveParams{
				Source: map[string]interface{}{
					"id": "100",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some/:id",
			},
			"http://some/100",
			nil,
			[]nameValue{},
		},
		{
			"Get with template query param",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id": "100",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some?a=:id",
			},
			"http://some?a=100",
			nil,
			[]nameValue{},
		},
		{
			"Get with template path and query params",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id":        "100",
					"firstName": "dude",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some/:id?name=:firstName",
			},
			"http://some/100?name=dude",
			nil,
			[]nameValue{},
		},
		{
			"Get with queryParams",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id": "100",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some",
				queryParams: []nameValue{
					nameValue{
						name: "a", value: "id",
					},
				},
			},
			"http://some?a=100",
			nil,
			[]nameValue{},
		},
		{
			"Get with template path params and queryParams",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id":     "100",
					"entity": "user",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some/:entity",
				queryParams: []nameValue{
					nameValue{
						name: "a", value: "id",
					},
				},
			},
			"http://some/user?a=100",
			nil,
			[]nameValue{},
		},
		{
			"Get with template path and query params and queryParams",
			graphql.ResolveParams{
				Args: map[string]interface{}{
					"id":        "100",
					"entity":    "user",
					"firstName": "dude",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some/:entity?name=:firstName",
				queryParams: []nameValue{
					nameValue{
						name: "a", value: "id",
					},
				},
			},
			"http://some/user?name=dude&a=100",
			nil,
			[]nameValue{},
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
			httpParams{
				templateURL: "http://some",
				method:      "POST",
				contentType: "json",
			},
			"http://some",
			map[string]interface{}{
				"data": "asdasd",
			},
			[]nameValue{
				nameValue{"Content-Type", "application/json"},
			},
		},
		{
			"Post using body param from placeholder",
			graphql.ResolveParams{
				Source: map[string]interface{}{
					"someSourceParam": "some-value",
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some",
				method:      "POST",
				contentType: "json",
				bodyParams: []nameValue{
					nameValue{"some-body-param", ":someSourceParam"},
				},
			},
			"http://some",
			map[string]interface{}{
				"some-body-param": "some-value",
			},
			[]nameValue{
				nameValue{"Content-Type", "application/json"},
			},
		},
		{
			"Post with both input and body param",
			graphql.ResolveParams{
				Source: map[string]interface{}{
					"someSourceParam": "some-source-value",
				},
				Args: map[string]interface{}{
					"input": map[string]interface{}{
						"some-arg": "some-arg-value",
					},
				},
				Context: testContext,
			},
			httpParams{
				templateURL: "http://some",
				method:      "POST",
				contentType: "json",
				bodyParams: []nameValue{
					nameValue{"some-body-param", ":someSourceParam"},
				},
			},
			"http://some",
			map[string]interface{}{
				"some-body-param": "some-source-value",
				"some-arg":        "some-arg-value",
			},
			[]nameValue{
				nameValue{"Content-Type", "application/json"},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Arrange
			headers := make(http.Header)
			for _, header := range test.expectedHeaders {
				headers[header.name] = []string{header.value}
			}

			// Act
			request, err := createHTTPRequest(test.hp, test.rp)

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
	b := cmp.Equal(expected, actual, cmp.AllowUnexported(httpParams{}, nameValue{}))
	if !b {
		fmt.Println("diff", cmp.Diff(expected, actual, cmp.AllowUnexported(httpParams{}, nameValue{})))
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
