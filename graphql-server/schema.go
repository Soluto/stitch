package main

import (
	graphql "github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser"
	"github.com/vektah/gqlparser/ast"

	"context"
	"fmt"
	"google.golang.org/grpc"
	"graphql-gateway/generated"
	"io"
)

const (
	address = "graphql-gateway.schema-registry:81"
)

func subscribeToSchema(schemas chan *graphql.Schema) (err error) {
	defer Recovery(&err)

	conn, err := grpc.Dial(address, grpc.WithInsecure())
	if err != nil {
		fmt.Println("error initiating GRPC channel")
		return err
	}
	defer conn.Close()

	gqlSchemaClient := gqlschema.NewGqlSchemaClient(conn)

	stream, err := gqlSchemaClient.Subscribe(context.Background(), &gqlschema.GqlSchemaSubscribeParams{})
	if err != nil {
		fmt.Println("error subscribing to schema-registry")
		return err
	}

	for {
		gqlSchemaMessage, err := stream.Recv()

		if err == io.EOF {
			fmt.Println("got EOF")
			break
		}
		if err != nil {
			fmt.Println("error receiving message")
			return err
		}

		sources, err := getSdl(gqlSchemaMessage.Schema)
		if err != nil {
			fmt.Println("error getting SDL from sources")
			return err
		}

		astSchema, err := parseSdl(sources)
		if err != nil {
			fmt.Println("error parsing SDL")
			return err
		}

		schema, err := ConvertSchema(astSchema)
		if err != nil {
			fmt.Println("error converting schema")
			return err
		}

		schemas <- schema
	}
	return
}

type source struct {
	name string
	sdl  string
}

func getSdl(schemaRegistrySdl string) ([]source, error) {
	return []source{
		source{
			name: "test.gql",
			sdl: `type Query { 
				hello: String @stub(value: "world")
				testHttp(iddd: String): JsonPlaceholder
				@http(url:"https://jsonplaceholder.typicode.com/todos/:iddd")
			}
			
			type JsonPlaceholder {
				userId: Int,
				id: Int,
				title: String,
				completed: Boolean
			}`,
		},
		source{
			name: "stub.gql",
			sdl:  `directive @stub(value: String) on FIELD_DEFINITION`,
		},
		source{
			name: "log.gql",
			sdl:  `directive @log on FIELD_DEFINITION`,
		},
		source{
			name: "overrideContext.gql",
			sdl:  `directive @overrideContext(value: String) on FIELD_DEFINITION`,
		},
		source{
			name: "http.gql",
			sdl: `
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
			`,
		},
		source{
			name: "schema-registry",
			sdl:  schemaRegistrySdl,
		},
	}, nil
}

func parseSdl(sources []source) (*ast.Schema, error) {
	astSources := make([]*ast.Source, len(sources))

	for i := range sources {
		astSources[i] = &ast.Source{
			Name:  sources[i].name,
			Input: sources[i].sdl,
		}
	}

	schema, err := gqlparser.LoadSchema(astSources...)

	if err != nil {
		return nil, err
	}

	return schema, nil
}
