package exports

import (
	"agogos/utils"

	"github.com/graphql-go/graphql"
)

type parentConnector struct {
	Value  interface{}
	Type   graphql.Type
	Parent interface{}
}

func (pc parentConnector) Field(fieldName string) (interface{}, error) {
	return utils.IdentityResolver(fieldName, pc.Value)
}
