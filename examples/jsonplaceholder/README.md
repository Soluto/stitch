# Description

This example demonstrate how we can take an existing JSON API and GraphQLfy it **without writing any code!**

Existing rest API description:

- User:

  - Gets User details
  - Example: https://jsonplaceholder.typicode.com/users?id=1

* Todo:

  - Gets User Todos
  - Example: https://jsonplaceholder.typicode.com/todos?userId=1

* Album:

  - Gets User Albums
  - Example: https://jsonplaceholder.typicode.com/albums?userId=1

* Photo:

  - Gets Album Photos
  - Example: https://jsonplaceholder.typicode.com/photos?albumId=1

* Post:

  - Gets User Posts
  - Example: https://jsonplaceholder.typicode.com/posts?userId=1

* Comment:

  - Gets Post Comments
  - Example: https://jsonplaceholder.typicode.com/comments?postId=1

# Benefits over rest API

We can organize the schema in the following hierarchy:

- User
  - Todos
  - Albums
    - photos
  - Posts
    - Comments

[Here is the GQL schema for this](schema.gql) (using the http directive)

Now, in a single GraphQL query we can get all the user details we chose. The GraphQL server will fetch everything from all the APIs

# How to run

`docker-compose up`

# Test

- Open http://localhost:3000/graphql
- Run the following query:

```js
query{
  user(id: "1"){
    id
    name
    username
    email
    address{
      street
      suite
      city
      zipcode
      geo{
        lat
        lng
      }
    }
    phone
    website
    company {
      name
      catchPhrase
      bs
    }
    todos{
      id
      title
      completed
    }
    albums{
      title
      photos{
        title
        thumbnailUrl
        url
      }
    }
    posts{
      title
      body
      comments{
        name
        email
        body
      }
    }
  }
}
```
