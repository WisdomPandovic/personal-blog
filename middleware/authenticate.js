// const jwt = require('jsonwebtoken');
// const User = require('../models/user'); 

// // Middleware function to authenticate the user based on the JWT token
// const authenticate = async (req, res, next) => {
//     // Get the token from the Authorization header (expects "Bearer <token>")
//     const token = req.header('Authorization')?.replace('Bearer ', '');

//     // If no token is provided, respond with an error
//     if (!token) {
//         return res.status(401).json({ message: 'No token provided' });
//     }

//     try {
//         // Verify and decode the token using your secret
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         // Fetch the user from the database using the decoded userId
//         const user = await User.findById(decoded.userId);
//         if (!user) {
//             return res.status(401).json({ message: 'User not found' });
//         }

//         // Check if the user's account is blocked
//         if (user.status === 'blocked') {
//             return res.status(403).json({ message: 'Your account has been blocked' });
//         }

//         // Attach the user object to the request for further use
//         req.user = user;

//         // Proceed to the next middleware or route handler
//         next();
//     } catch (error) {
//         return res.status(401).json({ message: 'Invalid token' });
//     }
// };

  

// // module.exports = authenticate;

// // const jwt = require('jsonwebtoken');
// // const User = require('../models/user');  // Make sure you import the User model

// // // Middleware function to authenticate the user based on the JWT token
// // const authenticate = async (req, res, next) => {
// //     // Get the token from the Authorization header (expects "Bearer <token>")
// //     const token = req.header('Authorization')?.replace('Bearer ', '');

// //     // If no token is provided, respond with an error
// //     if (!token) {
// //         return res.status(401).json({ message: 'No token provided' });
// //     }

// //     try {
// //         // Verify and decode the token using your secret
// //         const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
// //         // Fetch the user from the database using the decoded user ID
// //         const user = await User.findById(decoded.userId);

// //         // If no user is found, respond with an error
// //         if (!user) {
// //             return res.status(404).json({ message: 'User not found' });
// //         }

// //         // Check if the user's status is blocked
// //         if (user.status === 'blocked') {
// //             return res.status(403).json({ message: 'Your account has been blocked' });
// //         }

// //         // Attach the decoded user info to the request object for further processing
// //         req.user = user;

// //         next(); // Proceed to the next middleware or route handler

// //     } catch (error) {
// //         return res.status(401).json({ message: 'Invalid token' });
// //     }
// // };

// module.exports = authenticate;

const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authenticate = async (req, res, next) => {
    // Try to get the token from Authorization header first
    let token = req.header('Authorization')?.replace('Bearer ', '');

    // If not found, try to get it from cookies
    if (!token && req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('decoded', decoded)

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (user.status === 'blocked') {
            return res.status(403).json({ message: 'Your account has been blocked' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
