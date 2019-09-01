package utils

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/graphql-go/graphql"
)

var re = regexp.MustCompile(`{\w+\.\w+}`)

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
		sepIndex := strings.IndexRune(s, '.')

		sourceName := s[1:sepIndex]
		propName := s[sepIndex+1 : len(s)-1]
		prop := resolveFromParams(rp, sourceName, propName)
		if prop == nil {
			return ""
		}

		return fmt.Sprintf("%v", prop)
	})
}
