# imgurify-api
# Backend API

The backend of the Imgurify Project is built using Node.js, Express, and Mongoose. It provides endpoints to manage posts, tags, users, comments, and likes.

## Prerequisites

Before running the backend, make sure you have the following installed:

- Node.js
- MongoDB
- Express 
- Nodemon (for auto-reloading)

## Getting Started

1. Navigate to the `backend` directory.
2. Install dependencies with `npm install`.
3. Start the server with `nodemon index`.

## Available Endpoints

### Posts

- `GET /api/posts`: Get a list of all posts.
- `GET /api/posts/:id`: Get details of a specific post.
- `GET /api/posts-with-users`: Get posts related to a user.
- `GET /api//post/:id/views`: Get posts and it views.
- `POST /api/posts`: Create a new post.
- `POST /api//post/:id/increment-view`: Increment a post view.
- `PUT /api/posts/:id`: Update an existing post.
- `DELETE /api/posts/:id`: Delete a post.

### Tags

- `GET /api/tags`: Get a list of all tags.
- `GET /api/tags/:id`: Get details of a specific tag.
- `POST /api/tags`: Create a new tag.
- `PUT /api/tags/:id`: Update an existing tag.
- `DELETE /api/tags/:id`: Delete a tag.

### Users

- `GET /api/users`: Get a list of all users.
- `GET /api/users/:id`: Get details of a specific user.
- `POST /api/users`: Create a new user.
- `PUT /api/users/:id`: Update an existing user.
- `DELETE /api/users/:id`: Delete a user.

### Comments

- `GET /api/comments`: Get a list of all comments.
- `GET /api/comments/:id`: Get details of a specific comment.
- `POST /api/comments`: Create a new comment.
- `PUT /api/comments/:id`: Update an existing comment.
- `DELETE /api/comments/:id`: Delete a comment.

### Likes

- `POST /api/likes`: Like a post.
- `DELETE /api/likes/:id`: Unlike a post.

## Database Configuration

Ensure you have MongoDB running on your machine. You can configure the database connection in `backend/config/db.js`.

## Authentication

User authentication is handled using JSON Web Tokens (JWT). Make sure to include the token in the request headers for protected routes.

For more detailed API documentation, refer to the [API Documentation](API_DOCUMENTATION.md) file.
