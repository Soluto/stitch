import {ResourceGroup} from '.';

const sdls = {
    postmanEcho: `
    type Query {
        echo(in: JSON!): JSON @rest(url: "https://postman-echo.com/post", method: "POST", bodyArg: "in")
    }
    `,
    countries: `
    type Continent {
        code: String
        name: String
        something: String @stub(value: "rawr")
        countries: [Country]
      }

      type Country {
        code: String
        name: String
        native: String
        phone: String
        continent: Continent
        currency: String
        languages: [Language]
        emoji: String
        emojiU: String
      }

      type Language {
        code: String
        name: String
        native: String
        rtl: Int
      }

      type Query {
        continents: [Continent] @gql(url: "https://countries.trevorblades.com/", fieldName: "continents")
        country(countryCode: String!): Country @gql(url: "https://countries.trevorblades.com/", fieldName: "country", arguments: {code: "{args.countryCode}"})
        estonia: Country @gql(url: "https://countries.trevorblades.com/", fieldName: "country", arguments: {code: "EE"})
      }`,
    users: `
    type Query {
        user(id: String): User @rest(url: "https://jsonplaceholder.typicode.com/users/{args.id}")
    }

    type User @key(fields: "id") {
        id: ID!
        name: String!
        username: String!
        email: String
        address: Address
        phone: String
        website: String
        company: Company
    }

    type Address {
        street: String!
        suite: String
        city: String!
        zipcode: String
        geo: Geo
    }

    type Geo {
        lat: String!
        lng: String!
    }

    type Company {
        name: String!
        catchPhrase: String
        bs: String
    }`,
    todos: `
    type Todo {
        id: ID!
        title: String!
        completed: Boolean!
    }

    extend type User @key(fields: "id") {
        id: ID! @external
        todos: [Todo] @rest(url: "https://jsonplaceholder.typicode.com/todos?userId={source.id}")
    }`,
    albums: `
    extend type User @key(fields: "id") {
        id: ID! @external
        albums: [Album] @rest(url: "https://jsonplaceholder.typicode.com/albums?userId={source.id}")
    }

    type Album @key(fields: "id") {
        id: ID!
        title: String!
    }`,
    ['jsonplaceholder.photos']: `
    extend type Album @key(fields: "id") {
        id: ID! @external
        photos: [Photo] @rest(url: "https://jsonplaceholder.typicode.com/photos?albumId={source.id}")
    }

    type Photo {
        id: ID!
        title: String!
        url: String!
        thumbnailUrl: String!
    }`,
    posts: `
    extend type User @key(fields: "id") {
        id: ID! @external
        posts: [Post] @rest(url: "https://jsonplaceholder.typicode.com/posts?userId={source.id}")
    }

    type Post {
        id: ID!
        title: String!
        body: String!
        comments: [Comment] @rest(url: "https://jsonplaceholder.typicode.com/comments?postId={source.id}")
    }

    type Comment {
        id: ID!
        name: String!
        email: String!
        body: String!
    }
    `,
};

export async function fetch(): Promise<ResourceGroup> {
    return {
        schemas: sdls,
    };
}
