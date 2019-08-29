import fastify from "fastify";
import { ApolloServer, gql } from "apollo-server-fastify";
import hotels from "../data/hotels.json";

const port = Number(process.env.PORT) || 3000;

type Hotel = {
    id: string,
    name: string,
    address: string,
    city: string,
    country: string,
    stars: number,
    services: Array<string>,
};

const typeDefs = gql`
  type Hotel {
    id: String!
    name: String!
    address: String!
    city: String!
    country: String!
    stars: Int
    services: [String]
  }

  type Query {
    hotel(id: ID!): Hotel,
    hotels: [Hotel]
  }
`;

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
    Query: {
        hotel: (id: string): Hotel => hotels.find(h => h.id === id),
        hotels: (): Array<Hotel> => hotels,
    },
};

const server = new ApolloServer({ typeDefs, resolvers });

const app = fastify();

app.register(server.createHandler()).listen(port, "0.0.0.0", () => console.log(`Server is listening to port: ${port}`));