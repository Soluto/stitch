package registry

import (
	agogos "agogos/generated"
	"context"
	"io"
	"os"
	"time"

	log "github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

var (
	address = os.Getenv("REGISTRY_URL")
)

func closeWithContext(ctx context.Context, cls io.Closer) {
	<-ctx.Done()
	err := cls.Close()
	if err != nil {
		log.WithError(err).Warningln("Error closing")
	}
}

func createSubscribeClient(ctx context.Context) (agogos.Registry_SubscribeClient, error) {
	log.Infoln("Connecting to registry")
	conn, err := grpc.DialContext(ctx, address, grpc.WithInsecure())
	if err != nil {
		log.WithError(err).Warn("Error initiating GRPC channel")
		return nil, err
	}
	log.Infoln("Registry connection initiated")

	registryClient := agogos.NewRegistryClient(conn)
	stream, err := registryClient.Subscribe(ctx, &agogos.SubscribeParams{})
	if err != nil {
		log.WithError(err).Warn("Error subscribing to registry", err)
		conn.Close()
		return nil, err
	}

	log.Infoln("Subscribed to registry")

	go closeWithContext(ctx, conn)

	return stream, nil
}

func Connect(ctx context.Context) (chan *agogos.ConfigurationMessage, chan error) {
	configCh := make(chan *agogos.ConfigurationMessage)
	errCh := make(chan error)

	go func() {
		for {
			var err error
			clientCtx, cancel := context.WithCancel(ctx)
			client, err := createSubscribeClient(clientCtx)
			if err == nil {
				for {
					var config *agogos.ConfigurationMessage
					config, err = client.Recv()

					if err == nil {
						configCh <- config
					} else {
						break
					}
				}
			}

			errCh <- err
			cancel()
			time.Sleep(10 * time.Second)
		}
	}()

	return configCh, errCh
}
