package main

import (
	"net/http"
	"time"

	"agogos/metrics"

	"github.com/graphql-go/handler"
	log "github.com/sirupsen/logrus"
)

func main() {
	log.SetFormatter(&log.JSONFormatter{
		FieldMap: log.FieldMap{
			log.FieldKeyTime:  "time",
			log.FieldKeyLevel: "severity",
			log.FieldKeyMsg:   "message",
		},
	})

	log.Info("starting...")

	gqlConfigurations := make(chan gqlConfigurationResult)
	go func() {
		failures := 0
		for {
			start := time.Now()
			log.Info("Connecting to registry")
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
			log.Info("Got new GQL configuration")

			if gqlConfiguration.err != nil {
				log.Error("error", gqlConfiguration.err)
				continue
			}

			log.Info("updating graphql server...")

			graphqlHTTPHandler = handler.New(&handler.Config{
				Schema:     gqlConfiguration.schema,
				Pretty:     true,
				Playground: true,
				GraphiQL:   false,
			})
		}
	}()

	graphqlHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if graphqlHTTPHandler != nil {
			graphqlHTTPHandler.ServeHTTP(w, r)
		} else {
			http.Error(w, http.StatusText(http.StatusServiceUnavailable), http.StatusServiceUnavailable)
		}
	})
	metricsHandler := metrics.Init()

	mainHandler := metrics.InstrumentHandler(graphqlHandler)

	healthHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte("true"))
	})

	http.Handle("/graphql", mainHandler)
	http.Handle("/health", healthHandler)
	http.Handle("/metrics", metricsHandler)
	http.ListenAndServe(":8011", nil)
}
