import fastify from 'fastify';
import { ApolloServer, gql } from 'apollo-server-fastify';
import hotels from '../data/hotels.json';
import reviews from '../data/reviews.json';

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

type Review = {
    id: string,
    hotelId: string,
    author: string,
    text: string,
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
    reviews(limit: Int): [Review!]
  }

  type Review {
      id: String!
      hotel: Hotel!
      author: String!
      text: String!
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
    hotel: (_, { id }): Hotel => hotels.find(h => h.id === id),
    hotels: (): Array<Hotel> => hotels
  },
  Hotel: {
    reviews: ({ id }, { limit }): Array<Review> => reviews.filter(r => r.hotelId === id).slice(0, limit)
  }
};

(async () => {
  const server = new ApolloServer({ typeDefs, resolvers });

  const app = fastify();

  app.get('/health', (req, res) => { res.status(200).send(true); });

  app.register(server.createHandler());
  await app.ready();
  await app.listen(port, '0.0.0.0', () => console.log(`Server is listening to port: ${port}`));
})();
