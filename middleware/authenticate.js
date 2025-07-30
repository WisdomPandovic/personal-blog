// const jwt = require('jsonwebtoken');
// const User = require('../models/user');

// const authenticate = async (req, res, next) => {
//     // Try to get the token from Authorization header first
//     let token = req.header('Authorization')?.replace('Bearer ', '');

//     // If not found, try to get it from cookies
//     if (!token && req.cookies?.token) {
//         token = req.cookies.token;
//     }

//     if (!token) {
//         return res.status(401).json({ message: 'No token provided' });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         console.log('decoded', decoded)

//         const user = await User.findById(decoded.userId);
//         if (!user) {
//             return res.status(401).json({ message: 'User not found' });
//         }

//         if (user.status === 'blocked') {
//             return res.status(403).json({ message: 'Your account has been blocked' });
//         }

//         req.user = user;
//         next();
//     } catch (error) {
//         return res.status(401).json({ message: 'Invalid token' });
//     }
// };

// module.exports = authenticate;

const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authenticate = async (req, res, next) => {
    // 1️⃣ Try to get token from Authorization header (mobile)
    let token = req.header('Authorization')?.replace('Bearer ', '');

    // 2️⃣ If not found, try to get from web cookie
    if (!token && req.cookies?.personal_BLOG_token) {
        token = req.cookies.personal_BLOG_token;
    }

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // 3️⃣ Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);

        // 4️⃣ Find the user
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
        console.error('JWT verification error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
