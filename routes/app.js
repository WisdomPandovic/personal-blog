require('dotenv').config(); // Load environment variables at the very top

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express(); // Main app instance

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET, // Use the secret from environment variables
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Set secure cookies in production
    httpOnly: true,
    maxAge: 3600000 // 1 hour
  }
}));

// Create a router instance
const router = express.Router();

// Require routes after middleware setup
console.log('Loading routes...');
require('./routes/user')(router);
require('../routes/post')(router);
require('../routes/category')(router);
require('../routes/contact')(router);
require('../routes/subscription')(router);
require('../routes/search')(router);
require('../routes/payment')(router);
require('../routes/product')(router);
console.log('Routes loaded');

// Use the router
app.use('/', router);

// Middleware to handle default routes
app.use((req, res, next) => {
  if (req.originalUrl === '/' || req.originalUrl === '/favicon.ico') {
    return res.status(204).end(); // Return a non-content response
  }
  next(); // Continue to the next middleware
});

module.exports = app;
