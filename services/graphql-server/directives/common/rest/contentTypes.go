package rest

import (
	"encoding/json"
	"strings"
)

type contentTypeData struct {
	headerValue string
	serializer  func(map[string]interface{}) (string, error)
}

var contentTypes = map[string]contentTypeData{
	"json": contentTypeData{
		headerValue: "application/json",
		serializer:  jsonSerializer,
	},
}

var defaultContentType = contentTypes["json"]

func getContentType(contentTypeString string) contentTypeData {
	contentTypeString = strings.ToLower(contentTypeString)

	contentType, ok := contentTypes[contentTypeString]
	if !ok {
		contentType = defaultContentType
	}

	return contentType
}

func jsonSerializer(body map[string]interface{}) (string, error) {
	bodyJSON, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	return string(bodyJSON), nil
}
