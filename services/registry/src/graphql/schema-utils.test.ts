import { mergeDocuments } from "./schema-utils";
import { print } from "graphql/language/printer";
import gql from "graphql-tag";

describe("mergeDocuments", () => {
  const _mergeDocuments = docs => print(mergeDocuments(docs));

  test("Same types with two different fields", () => {
    const schemaA = gql`
      type SomeType {
        fieldA: String
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldB: String
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same types with same fields", () => {
    const schemaA = gql`
      type SomeType {
        fieldA: String
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldA: String
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same type, one of the types is with extra field", () => {
    const schemaA = gql`
      type SomeType {
        fieldA: String
        anotherField: String
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldA: String
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same types with same fields one has no directive the other has some directive", () => {
    const schemaA = gql`
      type SomeType {
        fieldA: String
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldA: String @someDirective(someArg: "some-value")
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same types with same fields that have the exact same directives", () => {
    const schemaA = gql`
      type SomeType {
        fieldA: String @someDirective(someArg: "some-value")
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldA: String @someDirective(someArg: "some-value")
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same types with same fields that have same directive type with different args", () => {
    const schemaA = gql`
      type SomeType {
        fieldA: String @someDirective(someArg: "some-value-1")
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldA: String @someDirective(someArg: "some-value-2")
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same types with same fields that have two different directives", () => {
    const schemaA = gql`
      type SomeType {
        fieldA: String @someDirective1(someArg: "some-value")
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldA: String @someDirective2(someArg: "some-value")
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same types with same fields but different field type", () => {
    const schemaA = gql`
      type SomeType {
        fieldA: String
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldA: Int
      }
    `;
    expect(() => _mergeDocuments([schemaA, schemaB])).toThrowError();
  });

  test("Same unions with different unioned types", () => {
    const schemaA = gql`
      union SomeUnion = String
    `;
    const schemaB = gql`
      union SomeUnion = Int
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same unions with same unioned types", () => {
    const schemaA = gql`
      union SomeUnion = String | Int
    `;
    const schemaB = gql`
      union SomeUnion = String | Int
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same unions one has partial of the types", () => {
    const schemaA = gql`
      union SomeUnion = String | Int
    `;
    const schemaB = gql`
      union SomeUnion = String
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Same unions one of the unioned type is the same and other types differ", () => {
    const schemaA = gql`
      union SomeUnion = String | Int
    `;
    const schemaB = gql`
      union SomeUnion = Boolean | String
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Merge directives on types - single definition", () => {
    const schemaA = gql`
      type SomeType @entity {
        fieldA: String
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldB: String
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Merge directives on types - duplicate definition", () => {
    const schemaA = gql`
      type SomeType @entity {
        fieldA: String
      }
    `;
    const schemaB = gql`
      type SomeType @entity {
        fieldB: String
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Merge interfaces on types - single definition", () => {
    const schemaA = gql`
      interface SomeInterface {
        someInterfaceField: String
      }
      type SomeType implements SomeInterface {
        fieldA: String
      }
    `;
    const schemaB = gql`
      type SomeType {
        fieldB: String
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });

  test("Merge interfaces on types - duplicate definition", () => {
    const schemaA = gql`
      interface SomeInterface {
        someInterfaceField: String
      }
      type SomeType implements SomeInterface {
        fieldA: String
      }
    `;
    const schemaB = gql`
      type SomeType implements SomeInterface {
        fieldB: String
      }
    `;
    const result = _mergeDocuments([schemaA, schemaB]);
    expect(result).toMatchSnapshot();
  });
});
