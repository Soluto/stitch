package main

import (
	graphql "github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser"
	"github.com/vektah/gqlparser/ast"

	"context"
	"fmt"
	"google.golang.org/grpc"
	"graphql-gateway/generated"
	"graphql-gateway/utils"
	"io"
)

const (
	address = "graphql-gateway.schema-registry:81"
)

type schemaResult struct {
	schema *graphql.Schema
	err    error
}

func subscribeToSchema(schemas chan schemaResult) (err error) {
	defer utils.Recovery(&err)

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
			schemas <- schemaResult{
				schema: nil,
				err:    err,
			}
			return err
		}

		astSchema, err := parseSdl(source{
			name: "schema regisrty sdl",
			sdl:  gqlSchemaMessage.Schema,
		})
		if err != nil {
			fmt.Println("error parsing SDL")
			fmt.Println("err", err)
			schemas <- schemaResult{
				schema: nil,
				err:    err,
			}
			return err
		}

		schema, err := ConvertSchema(astSchema)
		if err != nil {
			fmt.Println("error converting schema")
			schemas <- schemaResult{
				schema: nil,
				err:    err,
			}
			return err
		}

		schemas <- schemaResult{
			schema: schema,
			err:    nil,
		}
	}
	return
}

type source struct {
	name string
	sdl  string
}

func parseSdl(s source) (*ast.Schema, error) {
	schema, err := gqlparser.LoadSchema(&ast.Source{
		Name:  s.name,
		Input: s.sdl,
	})

	if err != nil {
		return nil, err
	}

	return schema, nil
}
