API Documentation

Posts
Get All Posts
Endpoint:
GET /api/posts

Description:
Retrieve a list of all posts.

Get a Specific Post
Endpoint:
GET /api/posts/:id

Description:
Retrieve details of a specific post identified by its ID.

Create a New Post
Endpoint:
POST /api/posts

Description:
Create a new post.

Request Body:

title (string, required): Title of the post.
image (string, required): URL of the image.
description (string, optional): Description of the post.
tag (string, required): ID of the associated tag.
user (string, required): ID of the user who created the post.
Update a Post
Endpoint:
PUT /api/posts/:id

Description:
Update an existing post identified by its ID.

Request Body:

title (string, optional): New title of the post.
image (string, optional): New URL of the image.
description (string, optional): New description of the post.
tag (string, optional): New ID of the associated tag.
Delete a Post
Endpoint:
DELETE /api/posts/:id

Description:
Delete a post identified by its ID.

Tags
Get All Tags
Endpoint:
GET /api/tags

Description:
Retrieve a list of all tags.

Get a Specific Tag
Endpoint:
GET /api/tags/:id

Description:
Retrieve details of a specific tag identified by its ID.

Create a New Tag
Endpoint:
POST /api/tags

Description:
Create a new tag.

Request Body:

title (string, required): Title of the tag.
Update a Tag
Endpoint:

bash
Copy code
PUT /api/tags/:id
Description:
Update an existing tag identified by its ID.

Request Body:

title (string, optional): New title of the tag.
Delete a Tag
Endpoint:
DELETE /api/tags/:id

Description:
Delete a tag identified by its ID.

Users
Get All Users
Endpoint:
GET /api/users

Description:
Retrieve a list of all users.

Get a Specific User
Endpoint:
GET /api/users/:id

Description:
Retrieve details of a specific user identified by their ID.

Create a New User
Endpoint:
POST /api/users

Description:
Create a new user.

Request Body:

username (string, required): Username of the user.
email (string, required): Email address of the user.
phoneNumber (number, required): Phone number of the user.
password (string, required): Password of the user.
role (string, optional): Role of the user (e.g., admin, user).
Update a User
Endpoint:
PUT /api/users/:id

Description:
Update an existing user identified by their ID.

Request Body:

username (string, optional): New username of the user.
email (string, optional): New email address of the user.
phoneNumber (number, optional): New phone number of the user.
password (string, optional): New password of the user.
role (string, optional): New role of the user (e.g., admin, user).
Delete a User
Endpoint:
DELETE /api/users/:id

Description:
Delete a user identified by their ID.

Comments
Get All Comments
Endpoint:
GET /api/comments

Description:
Retrieve a list of all comments.

Get a Specific Comment
Endpoint:

bash
Copy code
GET /api/comments/:id
Description:
Retrieve details of a specific comment identified by its ID.

Create a New Comment
Endpoint:
POST /api/comments

Description:
Create a new comment.

Request Body:

text (string, required): Text content of the comment.
post (string, required): ID of the associated post.
user (string, required): ID of the user who created the comment.
Update a Comment
Endpoint:
PUT /api/comments/:id

Description:
Update an existing comment identified by its ID.

Request Body:

text (string, optional): New text content of the comment.
Delete a Comment
Endpoint:
DELETE /api/comments/:id

Description:
Delete a comment identified by its ID.

Likes
Like a Post
Endpoint:
POST /api/likes

Description:
Like a post.

Request Body:

user (string, required): ID of the user who liked the post.
post (string, required): ID of the post that is liked.
Unlike a Post
Endpoint:
DELETE /api/likes/:id

Description:
Unlike a post identified by its ID.
