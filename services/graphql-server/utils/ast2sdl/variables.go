package ast2sdl

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/graphql-go/graphql"
)

type variablesClause struct {
	variableTypes map[string]string
}

func (v *variablesClause) Add(varName string, rp graphql.ResolveParams) {
	if _, ok := v.variableTypes[varName]; !ok {
		v.variableTypes[varName] = getVariableType(varName, rp)
	}
}

// buildVariableClause - builds variables clause to be used in the beginning of query if needed
func (v *variablesClause) String() string {
	if len(v.variableTypes) == 0 {
		return ""
	}

	builder := strings.Builder{}
	for varName, varType := range v.variableTypes {
		builder.WriteString(fmt.Sprintf("$%s:%s,", varName, varType))
	}
	clause := builder.String()
	clause = clause[:len(clause)-1]
	return fmt.Sprintf("(%s)", clause)
}

func (v *variablesClause) Values(rp graphql.ResolveParams) map[string]interface{} {
	result := make(map[string]interface{})
	for varName := range v.variableTypes {
		result[varName] = rp.Info.VariableValues[varName]
	}
	return result
}

func makeVariablesClause() variablesClause {
	return variablesClause{
		variableTypes: make(map[string]string),
	}
}

// getVariableType returns variable type name
func getVariableType(varName string, rp graphql.ResolveParams) string {
	variable := rp.Info.VariableValues[varName]

	switch variable.(type) {
	case int:
		return "Int"
	case string:
		return "String"
	default:
		return reflect.TypeOf(variable).Name()
	}
}
