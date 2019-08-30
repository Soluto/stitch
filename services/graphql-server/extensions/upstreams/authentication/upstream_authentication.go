package authentication

import (
	"net/http"

	agogos "agogos/generated"
)

// UpstreamAuthentication interface for UpstreamAuthentication extension. Supplies auth details to HTTP request
type UpstreamAuthentication interface {
	AddAuthentication(header *http.Header, scope string)
}

func CreateFromConfig(uac *agogos.UpstreamAuthCredentials) UpstreamAuthentication {
	return newUpstreamClientCredentials(uac)
}
