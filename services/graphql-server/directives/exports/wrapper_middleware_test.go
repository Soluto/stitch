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

func Test_wrapWithParentConnector_Scalar(t *testing.T) {
	assert.Equal(t, "asd", wrapWithParentConnector(nil, graphql.String, "asd"))
	assert.Equal(t, 123, wrapWithParentConnector(nil, graphql.Int, 123))
	assert.Equal(t, 123.321, wrapWithParentConnector(nil, graphql.Float, 123.321))
	assert.Equal(t, true, wrapWithParentConnector(nil, graphql.Boolean, true))
	assert.Equal(t, "asd-dsa", wrapWithParentConnector(nil, graphql.ID, "asd-dsa"))
}

func Test_wrapWithParentConnector_ListOfScalar(t *testing.T) {
	value := []interface{}{"asd"}
	assert.Equal(t, value, wrapWithParentConnector(nil, graphql.NewList(graphql.String), value))
}

func Test_wrapWithParentConnector_Objects_ScalarFields(t *testing.T) {
	value := map[string]interface{}{"one": 1}
	objType := graphql.NewObject(graphql.ObjectConfig{Fields: graphql.Fields{"one": &graphql.Field{Name: "one", Type: graphql.Int}}})

	pc := wrapWithParentConnector(nil, objType, value).(parentConnector)
	assert.Equal(t, pc.Value, value)
}
