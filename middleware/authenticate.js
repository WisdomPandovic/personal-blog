// /middleware/authenticate.js

const jwt = require('jsonwebtoken');

// Middleware function to authenticate the user based on the JWT token
const authenticate = (req, res, next) => {
    // Get the token from the Authorization header (expects "Bearer <token>")
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // If no token is provided, respond with an error
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Verify and decode the token using your secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach the decoded user info to the request object
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
