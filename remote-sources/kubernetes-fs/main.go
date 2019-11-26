package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/icza/dyno"
	"gopkg.in/yaml.v2"
)

type ObjectMeta struct {
	Name      string `yaml:"name"`
	Namespace string `yaml:"namespace"`
}

type AgogosResource struct {
	Kind       string             `yaml:"kind"`
	APIVersion string             `yaml:"apiVersion"`
	Metadata   ObjectMeta         `yaml:"metadata"`
	Spec       AgogosResourceSpec `yaml:"spec"`
}

type AgogosResourceSpec interface{}

func (r AgogosResource) FullName() string {
	var namespace string = r.Metadata.Namespace
	if namespace == "" {
		namespace = "default"
	}

	return fmt.Sprintf("%s_%s", namespace, r.Metadata.Name)
}

func readResources(dirPath string) ([]AgogosResource, error) {
	resources := make([]AgogosResource, 0)

	walkErr := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		content, err := ioutil.ReadFile(path)
		if err != nil {
			return err
		}

		documents := bytes.Split(content, []byte("---"))

		for _, doc := range documents {
			var resource AgogosResource
			err := yaml.Unmarshal(doc, &resource)
			if err != nil {
				return err
			}

			resources = append(resources, resource)
		}

		return nil
	})

	return resources, walkErr
}

var indices = map[string]string{
	"UpstreamClientCredentials": "upstreamclientcredentials",
	"Upstream":                  "upstreams",
	"Schema":                    "schemas",
}

func toIndex(resource AgogosResource) (string, bool) {
	index, ok := indices[resource.Kind]
	if !ok {
		return "", false
	}

	return index, true
}

func toResourceFormat(resources []AgogosResource) map[string]map[string]AgogosResourceSpec {
	result := make(map[string]map[string]AgogosResourceSpec)

	for _, resource := range resources {
		index, ok := toIndex(resource)
		if !ok {
			fmt.Printf("Unknown resource: %+v\n", resource)
			continue
		}

		if _, ok := result[index]; !ok {
			result[index] = make(map[string]AgogosResourceSpec)
		}

		result[index][resource.FullName()] = dyno.ConvertMapI2MapS(resource.Spec)
	}

	return result
}

var (
	resourceFolder = os.Getenv("RESOURCE_FOLDER")
	port           = os.Getenv("PORT")
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Reading resources...")
		resources, err := readResources(resourceFolder)
		if err != nil {
			log.Println("Error reading resources", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		result := toResourceFormat(resources)

		encoder := json.NewEncoder(w)
		err = encoder.Encode(result)
		if err != nil {
			log.Println("Error in encoding response", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})

	log.Printf("Listening on %v...", port)
	log.Fatalln(http.ListenAndServe(":"+port, nil))
}
