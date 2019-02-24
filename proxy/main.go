package main

import (
	"fmt"
	"github.com/graphql-go/handler"
	"github.com/vektah/gqlparser"
	"github.com/vektah/gqlparser/ast"
	"net/http"
)

func main() {
	fmt.Print("starting")
	schema, err := gqlparser.LoadSchema(&ast.Source{
		Name: "test.gql",
		Input: `directive @stub(value: String) on FIELD_DEFINITION

				type Query { 
					hello: String @stub(value: "world")  
				}`,
	})

	if err != nil {
		fmt.Println(err)
	}
	fmt.Printf("%+v\n", schema)
	es, gqlErr := ConvertSchema(schema)

	if gqlErr != nil {
	}

	h := handler.New(&handler.Config{
		Schema:     es,
		Pretty:     true,
		Playground: true,
		GraphiQL:   false,
	})

	http.Handle("/graphql", h)
	http.ListenAndServe(":8011", nil)

}
