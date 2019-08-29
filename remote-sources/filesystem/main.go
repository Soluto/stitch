package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

var (
	sourceFolder = os.Getenv("SOURCE_FOLDER")
	port         = os.Getenv("PORT")
)

func readFolder(dirName string) (map[string]interface{}, error) {
	fullDirName := path.Join(sourceFolder, dirName)
	files, err := ioutil.ReadDir(fullDirName)
	if err != nil {
		return nil, err
	}

	contents := make(map[string]interface{}, len(files))

	for _, file := range files {
		if strings.HasPrefix(file.Name(), ".") {
			continue
		}

		content, err := os.Open(path.Join(fullDirName, file.Name()))
		if err != nil {
			return nil, err
		}

		defer content.Close()

		var jsonContent map[string]interface{}
		switch filepath.Ext(file.Name()) {
		case ".json":
			decoder := json.NewDecoder(content)
			decoder.Decode(&jsonContent)
		case ".gql":
			definition, _ := ioutil.ReadAll(content)
			jsonContent = make(map[string]interface{})
			jsonContent["definition"] = string(definition)
		}
		contents[file.Name()] = jsonContent
	}

	return contents, nil
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		schemas, err := readFolder("schemas")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		upstreams, err := readFolder("upstreams")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		upstreamsClientCredentials, err := readFolder("upstreamsclientcredentials")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		result := map[string]interface{}{
			"schemas":                   schemas,
			"upstreams":                 upstreams,
			"upstreamclientcredentials": upstreamsClientCredentials,
		}

		encoder := json.NewEncoder(w)
		encoder.Encode(result)
	})

	log.Printf("Listening on %v...", port)
	http.ListenAndServe(":"+port, nil)
}
