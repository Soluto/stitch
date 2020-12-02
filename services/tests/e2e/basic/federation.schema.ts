import { print } from 'graphql';
import { gql } from 'apollo-server-core';

export const schema1 = {
  metadata: {
    namespace: 'stitching-1',
    name: 'name',
  },
  schema: print(gql`
    enum BarEnum {
      ONE
      TWO
      THREE
    }

    interface IBar {
      bar: BarEnum!
    }

    type Foo implements IBar @key(fields: "bar") {
      bar: BarEnum! @localResolver(value: "ONE")
      tar: String! @localResolver(value: "TAR")
    }

    type Query {
      foo: Foo! @localResolver(value: "{{}}")
    }
  `),
};

export const schema2 = {
  metadata: {
    namespace: 'stitching-2',
    name: 'name',
  },
  schema: print(gql`
    extend type Foo @key(fields: "bar") {
      bar: BarEnum! @external
    }

    enum BarEnum {
      ONE
      TWO
      THREE
    }

    type Baz {
      foo: Foo! @localResolver(value: "{{}}")
    }

    interface IBar {
      bar: BarEnum!
    }

    type Quz implements IBar {
      bar: BarEnum! @localResolver(value: "TWO")
    }

    type Query {
      baz: Baz! @localResolver(value: "{{}}")
      quz: Quz! @localResolver(value: "{{}}")
    }
  `),
};
