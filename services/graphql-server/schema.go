package main

import (
	graphql "github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser"
	"github.com/vektah/gqlparser/ast"

	agogos "agogos/generated"
	"agogos/utils"
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"google.golang.org/grpc"

	upstreams "agogos/extensions/upstreams"
	upstreamsAuthentication "agogos/extensions/upstreams/authentication"
)

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return fallback
	}
	return value
}

var (
	address = getenv("REGISTRY_URL", "agogos.registry:81")
)

type gqlConfigurationResult struct {
	schema *graphql.Schema
	err    error
}

func subscribeToRegistry(gqlConfigurations chan gqlConfigurationResult) (err error) {
	defer utils.Recovery(&err)

	conn, err := grpc.Dial(address, grpc.WithInsecure())
	if err != nil {
		fmt.Println("error initiating GRPC channel")
		return err
	}
	defer conn.Close()

	registryClient := agogos.NewRegistryClient(conn)

	stream, err := subscribe(registryClient)
	if err != nil {
		fmt.Println("error subscribing to registry", err)
		return err
	}

	for {
		registryMessage, err := stream.Recv()

		if err == io.EOF {
			fmt.Println("got EOF")
			break
		}
		if err != nil {
			fmt.Println("error receiving message")
			gqlConfigurations <- gqlConfigurationResult{
				schema: nil,
				err:    err,
			}
			return err
		}

		upstreams.Init(registryMessage.Upstreams)
		upstreamsAuthentication.Init(registryMessage.UpstreamAuthCredentials)

		astSchema, err := parseSdl(source{
			name: "schema registry sdl",
			sdl:  registryMessage.Schema.Definition,
		})
		if err != nil {
			fmt.Println("error parsing SDL")
			gqlConfigurations <- gqlConfigurationResult{
				schema: nil,
				err:    err,
			}
			return err
		}

		schema, err := ConvertSchema(astSchema)
		if err != nil {
			fmt.Println("error converting schema")
			gqlConfigurations <- gqlConfigurationResult{
				schema: nil,
				err:    err,
			}
			return err
		}

		gqlConfigurations <- gqlConfigurationResult{
			schema: schema,
			err:    nil,
		}
	}
	return
}

func subscribe(client agogos.RegistryClient) (stream agogos.Registry_SubscribeClient, err error) {
	for i := 0; i < 3; i++ {
		stream, err = client.Subscribe(context.Background(), &agogos.SubscribeParams{})
		if err == nil {
			break
		}
		if i+1 < 3 {
			time.Sleep(3000 * time.Millisecond)
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
