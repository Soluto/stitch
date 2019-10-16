package rest

import (
	"encoding/json"
)

type contentTypeData struct {
	name        string
	headerValue string
	bodyHandler func(map[string]interface{}) (string, error)
}

type contentTypesStruct struct {
	JSON contentTypeData
}

var contentTypes = contentTypesStruct{
	JSON: contentTypeData{
		name:        "json",
		headerValue: "application/json",
		bodyHandler: jsonBodyHandler,
	},
}

func getContentType(contentType string) contentTypeData {
	switch contentType {
	case contentTypes.JSON.name:
		return contentTypes.JSON
	default:
		return contentTypes.JSON
	}
}

func jsonBodyHandler(body map[string]interface{}) (string, error) {
	bodyJSON, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	return string(bodyJSON), nil
}
