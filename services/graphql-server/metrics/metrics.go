package metrics

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	totalCountVec = prometheus.NewCounterVec(prometheus.CounterOpts{
		Namespace: "http",
		Subsystem: "request",
		Name:      "total_count",
		Help:      "Count of all HTTP requests",
	}, []string{"code", "method"})

	durationHistogramVec = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "http",
			Subsystem: "request",
			Name:      "duration_in_seconds",
			Help:      "A histogram of latencies for requests.",
			Buckets:   []float64{.25, .5, 1, 2.5, 5, 10},
		},
		[]string{"handler", "method", "code"},
	)

	RegistryConnectionErrors = prometheus.NewCounter(prometheus.CounterOpts{
		Namespace: "errors",
		Subsystem: "registry",
		Name:      "connection",
		Help:      "Registry connection issues",
	})

	SchemaErrors = prometheus.NewCounter(prometheus.CounterOpts{
		Namespace: "errors",
		Subsystem: "registry",
		Name:      "schema",
		Help:      "Schema processing issues",
	})
)

// Init - initializes registry
func Init() http.Handler {
	r := prometheus.NewRegistry()
	r.MustRegister(totalCountVec)
	r.MustRegister(durationHistogramVec)
	r.MustRegister(RegistryConnectionErrors)
	r.MustRegister(SchemaErrors)

	return promhttp.HandlerFor(r, promhttp.HandlerOpts{})
}

// InstrumentHandler adds prometheus metrics to handler
func InstrumentHandler(h http.Handler) http.HandlerFunc {
	a := promhttp.InstrumentHandlerCounter(totalCountVec, h)
	b := promhttp.InstrumentHandlerDuration(durationHistogramVec.MustCurryWith(prometheus.Labels{"handler": "graphql"}), a)
	return b
}
