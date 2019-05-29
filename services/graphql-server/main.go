package main

import (
	"fmt"
	"github.com/graphql-go/handler"
	"net/http"
	"time"
)

func main() {
	fmt.Println("starting...")

	gqlConfigurations := make(chan gqlConfigurationResult)
	go func() {
		failures := 0
		for {
			start := time.Now()
			subscribeToGqlConfiguration(gqlConfigurations)
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
			gqlConfiguration := <-gqlConfigurations
			fmt.Println("Got new GQL configuration")

			if gqlConfiguration.err != nil {
				fmt.Println("error", gqlConfiguration.err)
				continue
			}

			fmt.Println("updating graphql server...")

			graphqlHttpHandler = handler.New(&handler.Config{
				Schema:     gqlConfiguration.schema,
				Pretty:     true,
				Playground: true,
				GraphiQL:   false,
			})
		}
	}()

	mainHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if graphqlHttpHandler != nil {
			graphqlHttpHandler.ServeHTTP(w, r)
		}
	})

	http.Handle("/graphql", mainHandler)
	http.ListenAndServe(":8011", nil)
}
