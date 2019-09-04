package authentication

import (
	"agogos/server/runtime"
	"context"
	"net/http"

	"github.com/sirupsen/logrus"
)

type forwardHeaderAuth struct{}

var authHeaderForwarder = forwardHeaderAuth{}

func (ucc forwardHeaderAuth) AddAuthentication(ctx context.Context, header *http.Header, scope string) {
	originalRequest := runtime.GetRequest(ctx)
	if originalRequest == nil {
		logrus.Panic("Could not find request in context, this should never happen")
		return
	}

	authHeader := originalRequest.Header.Get("Authorization")

	if authHeader == "" {
		logrus.Info("Could not find authorization header, not forwarding")
		return
	}

	header.Set("Authorization", authHeader)
}

func newForwardAuthHeader() UpstreamAuthentication {
	return authHeaderForwarder
}
