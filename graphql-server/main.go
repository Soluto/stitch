package main

import (
	"fmt"
	"github.com/graphql-go/handler"
	"net/http"
	"time"
)

func main() {
	fmt.Println("starting...")

	time.Sleep(10 * time.Second) // TODO: Remove after subscribeToSchema has a connect retry logic

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
		if graphqlHttpHandler != nil {
			graphqlHttpHandler.ServeHTTP(w, r)
		}
	})

	http.Handle("/graphql", mainHandler)
	http.ListenAndServe(":8011", nil)
}
