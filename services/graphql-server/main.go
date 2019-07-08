package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/graphql-go/handler"
)

func main() {
	fmt.Println("starting...")

	gqlConfigurations := make(chan gqlConfigurationResult)
	go func() {
		failures := 0
		for {
			start := time.Now()
			fmt.Println("Connecting to registry")
			subscribeToRegistry(gqlConfigurations)
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

	var graphqlHTTPHandler http.Handler

	go func() {
		for {
			gqlConfiguration := <-gqlConfigurations
			fmt.Println("Got new GQL configuration")

			if gqlConfiguration.err != nil {
				fmt.Println("error", gqlConfiguration.err)
				continue
			}

			fmt.Println("updating graphql server...")

			graphqlHTTPHandler = handler.New(&handler.Config{
				Schema:     gqlConfiguration.schema,
				Pretty:     true,
				Playground: true,
				GraphiQL:   false,
			})
		}
	}()

	mainHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if graphqlHTTPHandler != nil {
			graphqlHTTPHandler.ServeHTTP(w, r)
		} else {
			http.Error(w, http.StatusText(http.StatusServiceUnavailable), http.StatusServiceUnavailable)
		}
	})

	http.Handle("/graphql", mainHandler)
	http.ListenAndServe(":8011", nil)
}
