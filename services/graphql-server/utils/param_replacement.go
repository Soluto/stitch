package utils

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/graphql-go/graphql"
)

var reString = `{\w+\.\w+}`
var re = regexp.MustCompile(reString)
var reExactlyOneString = fmt.Sprintf("^%s$", reString)
var reExactlyOne = regexp.MustCompile(reExactlyOneString)

func resolveFromParams(rp graphql.ResolveParams, sourceName string, propName string) interface{} {
	switch sourceName {
	case "args":
		val, ok := rp.Args[propName]
		if !ok {
			return nil
		}
		return val
	case "source":
		res, err := IdentityResolver(propName, rp.Source)
		if err != nil {
			return nil
		}
		return res
	default:
		return nil
	}
}

// ReplaceWithParameters replaces template strings that look like "something {args.id} {source.someotherprop}", replacing those templates with the corresponding properties in the ResolveParams
func ReplaceWithParameters(rp graphql.ResolveParams, str string) string {
	return re.ReplaceAllStringFunc(str, func(s string) string {
		prop := getProp(rp, s)
		if prop == nil {
			return ""
		}

		return fmt.Sprintf("%v", prop)
	})
}

func getProp(rp graphql.ResolveParams, template string) interface{} {
	sepIndex := strings.IndexRune(template, '.')

	sourceName := template[1:sepIndex]
	propName := template[sepIndex+1 : len(template)-1]

	return resolveFromParams(rp, sourceName, propName)
}

// GetReplacementIfArray - If str is only a single template that resolves to an array, it returns that array, otherwise it returns nil
func GetReplacementIfArray(rp graphql.ResolveParams, str string) []interface{} {
	s := reExactlyOne.FindString(str)
	if s == "" {
		return nil
	}

	prop := getProp(rp, str)
	if prop == nil {
		return nil
	}

	res, ok := prop.([]interface{})
	if !ok {
		return nil
	}

	return res
}
