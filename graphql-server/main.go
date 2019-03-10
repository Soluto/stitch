package main

import (
	"fmt"
	"github.com/graphql-go/handler"
	"net/http"
	"time"
)

func main() {
	fmt.Print("starting")

	time.Sleep(20000 * time.Millisecond)
	schema, err := GetSchema()

	if err != nil {
		fmt.Println(err)
	}

	fmt.Printf("%+v\n", schema)

	h := handler.New(&handler.Config{
		Schema:     schema,
		Pretty:     true,
		Playground: true,
		GraphiQL:   false,
	})

	http.Handle("/graphql", h)
	http.ListenAndServe(":8011", nil)

}
