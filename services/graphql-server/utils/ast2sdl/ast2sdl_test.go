package ast2sdl

import (
	"reflect"
	"strings"
	"testing"

	"github.com/graphql-go/graphql"
	"github.com/graphql-go/graphql/language/ast"
)

func TestBuildSDLQuery(t *testing.T) {
	type args struct {
		queryName string
		rp        graphql.ResolveParams
		args      string
	}
	tests := []struct {
		name string
		args args
		want GqlRequestConfig
	}{
		// TODO: Add test cases.
		{
			name: "Simple query",
			args: args{
				queryName: "books",
				rp: graphql.ResolveParams{
					Info: graphql.ResolveInfo{
						FieldASTs: []*ast.Field{
							{
								Kind:         "Field",
								Name:         newAstName("books"),
								SelectionSet: newSelectionSet([]string{"author", "title"}),
							},
						},
					},
				},
				args: "",
			},
			want: GqlRequestConfig{
				Query: strings.ReplaceAll(`query {
					books {
						author
						title
					}
				}
				`, "\t", ""),
				VariableValues: make(map[string]interface{}),
			},
		},

		{
			name: "Nested query",
			args: args{
				queryName: "books",
				rp: graphql.ResolveParams{
					Info: graphql.ResolveInfo{
						FieldASTs: []*ast.Field{
							{
								Kind: "Field",
								Name: newAstName("books"),
								SelectionSet: newNestedSelectionSet(map[string][]string{
									"author": {"firstName", "lastName"},
									"title":  {},
								}),
							},
						},
					},
				},
				args: "",
			},
			want: GqlRequestConfig{
				Query: strings.ReplaceAll(`query {
					books {
						author {
							firstName
							lastName
						}
						title
					}
				}
				`, "\t", ""),
				VariableValues: make(map[string]interface{}),
			},
		},

		{
			name: "Nested query with fragment",
			args: args{
				queryName: "books",
				rp: graphql.ResolveParams{
					Info: graphql.ResolveInfo{
						FieldASTs: []*ast.Field{
							{
								Kind: "Field",
								Name: newAstName("books"),
								SelectionSet: newNestedSelectionSet(map[string][]string{
									"author":  {"firstName", "lastName"},
									"title":   {},
									"reviews": {"...reviewFragment"},
								}),
							},
						},
						Fragments: map[string]ast.Definition{
							"reviewFragment": &ast.FragmentDefinition{
								Kind:         "FragmentDefinition",
								Name:         newAstName("reviewFramgnet"),
								SelectionSet: newSelectionSet([]string{"reviewer", "text", "stars"}),
								TypeCondition: &ast.Named{
									Name: newAstName("Review"),
								},
							},
						},
					},
				},
				args: "",
			},
			want: GqlRequestConfig{
				Query: strings.ReplaceAll(`query {
					books {
						author {
							firstName
							lastName
							}
							title
							reviews {
								...reviewFragment
							}
						}
					}
					fragment reviewFragment on Review {
						reviewer
						text
						stars
					}
					`, "\t", ""),
				VariableValues: make(map[string]interface{}),
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := BuildSDLQuery(tt.args.queryName, tt.args.rp, tt.args.args); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("BuildSDLQuery():\n %+v \nwant: \n %+v", got, tt.want)
			}
		})
	}
}

func newAstName(name string) *ast.Name {
	return &ast.Name{
		Value: name,
	}
}

func newSelectionSet(fields []string) *ast.SelectionSet {
	result := &ast.SelectionSet{
		Selections: make([]ast.Selection, len(fields)),
	}
	for i, field := range fields {
		if strings.HasPrefix(field, "...") {
			result.Selections[i] = &ast.FragmentSpread{
				Name: newAstName(field[3:]),
				Kind: "FragmentSpread",
			}
		} else {
			result.Selections[i] = &ast.Field{
				Name: newAstName(field),
				Kind: "Field",
			}
		}
	}
	return result
}

func newNestedSelectionSet(fields map[string][]string) *ast.SelectionSet {
	result := &ast.SelectionSet{
		Selections: make([]ast.Selection, len(fields)),
	}
	i := 0
	for fieldName, field := range fields {
		if strings.HasPrefix(fieldName, "...") {
			result.Selections[i] = &ast.FragmentSpread{
				Name: newAstName(fieldName[3:]),
				Kind: "FragmentSpread",
			}
		} else {
			result.Selections[i] = &ast.Field{
				Name:         newAstName(fieldName),
				Kind:         "Field",
				SelectionSet: newSelectionSet(field),
			}
		}
		i++
	}

	return result
}
