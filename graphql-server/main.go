package main

import (
	"fmt"
	graphql "github.com/graphql-go/graphql"
	"github.com/graphql-go/handler"
	"net/http"
	"time"
)

func main() {
	fmt.Println("starting...")

	time.Sleep(10000 * time.Millisecond) // TODO: Remove after subscribeToSchema has a connect retry logic

	schemas := make(chan *graphql.Schema)
	go subscribeToSchema(schemas)

	var graphqlHttpHandler http.Handler = nil

	go func() {
		for {
			schema := <-schemas
			fmt.Println("got new schema")
			fmt.Println("updating graphql server...")

			graphqlHttpHandler = handler.New(&handler.Config{
				Schema:     schema,
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
