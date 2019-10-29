package templating

import (
	"agogos/directives/exports"
	"agogos/utils"
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
		res, err := utils.IdentityResolver(propName, rp.Source)
		if err != nil {
			return nil
		}
		return res
	case "exports":
		return exports.ResolveExport(rp.Source, propName)
	default:
		return nil
	}
}

func resolveTemplate(rp graphql.ResolveParams, template string) interface{} {
	sepIndex := strings.IndexRune(template, '.')

	sourceName := template[1:sepIndex]
	propName := template[sepIndex+1 : len(template)-1]

	return resolveFromParams(rp, sourceName, propName)
}

// ReplaceWithParameters replaces template strings that look like "something {args.id} {source.someotherprop}", replacing those templates with the corresponding properties in the ResolveParams
func ReplaceWithParameters(rp graphql.ResolveParams, str string) string {
	return re.ReplaceAllStringFunc(str, func(s string) string {
		prop := resolveTemplate(rp, s)
		if prop == nil {
			return ""
		}

		return fmt.Sprintf("%v", prop)
	})
}

// ResolveSingleArrayTemplate - If str is only a single template that resolves to an array, it returns that array, otherwise it returns nil
func ResolveSingleArrayTemplate(rp graphql.ResolveParams, str string) []interface{} {
	s := reExactlyOne.FindString(str)
	if s == "" {
		return nil
	}

	prop := resolveTemplate(rp, str)
	if prop == nil {
		return nil
	}

	res, ok := prop.([]interface{})
	if !ok {
		return nil
	}

	return res
}
