package main

import (
	"context"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/dgrijalva/jwt-go/request"
	"github.com/graphql-go/handler"
	"net/http"
	"time"
)

func contextWithClaims(r *http.Request) context.Context {
	tokenStr, err := request.OAuth2Extractor.ExtractToken(r)

	if err != nil {
		return r.Context()
	}

	parser := new(jwt.Parser)
	claims := jwt.MapClaims{}

	//This is only valid because Airbag handle authentication, otherwise
	// - this can be a serious security issue
	_, _, err = parser.ParseUnverified(tokenStr, claims)

	if err != nil {
		return r.Context()
	}

	return context.WithValue(r.Context(), "claims", claims)
}

func main() {
	fmt.Println("starting...")

	schemas := make(chan schemaResult)
	go func() {
		failures := 0
		for {
			start := time.Now()
			subscribeToSchema(schemas)
			elapsed := time.Since(start)
			if elapsed < (10 * time.Second) {
				failures++
			} else {
				failures = 0
			}
			if failures == 5 {
				panic("Failed to connect to grpc channel")
			}
			time.Sleep(5 * time.Second)
		}
	}()

	var graphqlHttpHandler http.Handler = nil

	go func() {
		for {
			schema := <-schemas
			fmt.Println("got new schema")

			if schema.err != nil {
				fmt.Println("error", schema.err)
				continue
			}

			fmt.Println("updating graphql server...")

			graphqlHttpHandler = handler.New(&handler.Config{
				Schema:     schema.schema,
				Pretty:     true,
				Playground: true,
				GraphiQL:   false,
			})
		}
	}()

	mainHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		newRequest := r.WithContext(contextWithClaims(r))
		if graphqlHttpHandler != nil {
			graphqlHttpHandler.ServeHTTP(w, newRequest)
		}
	})

	http.Handle("/graphql", mainHandler)
	http.ListenAndServe(":8011", nil)
}
