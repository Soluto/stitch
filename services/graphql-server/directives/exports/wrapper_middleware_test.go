package exports

import (
	"testing"

	"github.com/graphql-go/graphql"

	"github.com/stretchr/testify/assert"
)

var defaultExportsMap = map[string]map[string][]string{
	"context-key": map[string][]string{
		deviceType.Name(): []string{"DeviceId"},
	},
}
var deviceType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Device",
})
var someType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Some",
})

func Test_resolveExport_Basic(t *testing.T) {
	rc := parentConnector{
		Value: map[string]interface{}{
			"DeviceId": "some-device-id",
		},
		Type: deviceType,
	}

	result := resolveExport(defaultExportsMap, rc, "context-key")

	assert.Equal(t, "some-device-id", result)
}

func Test_resolveExport_NoValueFound(t *testing.T) {
	exportsMap := map[string]map[string][]string{}

	rc := parentConnector{
		Value: map[string]interface{}{
			"DeviceId": "some-device-id",
		},
		Type: deviceType,
	}

	result := resolveExport(exportsMap, rc, "context-key")

	assert.Nil(t, result)
}

func Test_resolveExport_MultipleValues_TakesFirstAvailable(t *testing.T) {
	exportsMap := map[string]map[string][]string{
		"context-key": map[string][]string{
			deviceType.Name(): []string{"SomeOtherField", "DeviceId"},
		},
	}

	rc := parentConnector{
		Value: map[string]interface{}{
			"DeviceId": "some-device-id",
		},
		Type: deviceType,
	}

	result := resolveExport(exportsMap, rc, "context-key")

	assert.Equal(t, "some-device-id", result)
}

func Test_resolveExport_ParentHasKey(t *testing.T) {
	parentRc := parentConnector{
		Value: map[string]interface{}{
			"DeviceId": "some-device-id",
		},
		Type: deviceType,
	}
	rc := parentConnector{
		Value:  nil,
		Parent: parentRc,
		Type:   someType,
	}

	result := resolveExport(defaultExportsMap, rc, "context-key")

	assert.Equal(t, "some-device-id", result)
}

func Test_resolveExport_MultipleAncestorsWithKey_TakeYoungest(t *testing.T) {
	parentRc := parentConnector{
		Value: map[string]interface{}{
			"DeviceId": "parent-device-id",
		},
		Type: deviceType,
	}
	rc := parentConnector{
		Value: map[string]interface{}{
			"DeviceId": "child-device-id",
		},
		Parent: parentRc,
		Type:   deviceType,
	}

	result := resolveExport(defaultExportsMap, rc, "context-key")

	assert.Equal(t, "child-device-id", result)
}

func Test_resolveExport_MultipleAncestorsWithKey_YoungestIsNull_TakeOlderOne(t *testing.T) {
	parentRc := parentConnector{
		Value: map[string]interface{}{
			"DeviceId": "parent-device-id",
		},
		Type: deviceType,
	}
	rc := parentConnector{
		Value: map[string]interface{}{
			"DeviceId": nil,
		},
		Parent: parentRc,
		Type:   deviceType,
	}

	result := resolveExport(defaultExportsMap, rc, "context-key")

	assert.Equal(t, "parent-device-id", result)
}
