

require('dotenv').config();

const User = require('../../models/user');
const bcrypt = require('bcryptjs');
const Post = require("../../models/post");
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require("../../utils/emailService");

router.get('/', (req, res) => {
    res.json({ msg: "This is my user index route" });
});

router.get('/users', async (req, res) => {
    try {
        let users = await User.find().lean();
        res.json(users);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const mongoose = require('mongoose');

router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if `id` is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "Invalid user ID", code: 400 });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ msg: "User does not exist", code: 404 });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: "Server error", code: 500, error: err.message });
    }
});

// router.post("/users", async (req, res) => {
//     try {
//         const { username, email, phoneNumber, password, role } = req.body;

//         // Email format validation
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(email)) {
//             return res.status(400).json({ error: "Invalid email format." });
//         }

//         // Check if email is already used
//         const existingUser = await User.findOne({ email: email.toLowerCase() });
//         if (existingUser) {
//             return res.status(400).json({ error: "Email is already registered." });
//         }

//         // Password validation
//         const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
//         if (!passwordRegex.test(password)) {
//             return res.status(400).json({
//                 error: "Password must be at least 8 characters long and contain at least one special character."
//             });
//         }

//         const verificationToken = crypto.randomBytes(32).toString("hex");

//         const user = new User({
//             username,
//             email: email.toLowerCase(),
//             phoneNumber,
//             password,
//             role,
//             isVerified: false,
//             verificationToken
//         });

//         await user.save();

//          // Send verification email
//          const verificationLink = `${process.env.CLIENT_URL}/auth/verify-email?token=${verificationToken}`;
//          const html = `
//              <h3>Verify your email</h3>
//              <p>Click the link below to verify your email:</p>
//              <a href="${verificationLink}">${verificationLink}</a>
//          `;
 
//          await sendEmail(email, "Verify your email", html);

//         // res.json(user);
//         res.status(201).json({ msg: "User registered. Please check your email to verify your account." });
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// });

router.post('/admin/signup', async (req, res) => {
    try {
        const { username, email, password, phoneNumber } = req.body;

        // Check if email or username already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ msg: 'Email or Username already exists' });
        }

        // Create a new admin user
        const newUser = new User({
            username,
            email,
            password,
            phoneNumber,
            isAdmin: true, // Make sure the user is an admin
            role: 'admin', // Set the role to 'admin'
        });

        // Save the new user
        await newUser.save();
        res.status(201).json({ msg: 'Admin user created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.patch('/users/:id', async (req, res) => {
    try {
        let { id } = req.params;
        let user = await User.findById(id);

        if (!user) return res.status(404).json({ msg: "User does not exist", code: 404 });

        // Update only the fields provided in the request body
        Object.assign(user, req.body);

        await user.save();

        res.json(user);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.delete('/user/:id', async (req, res) => {
    try {
        let { id } = req.params;
        let user = await User.findOneAndDelete({ _id: id });

        if (!user) {
            return res.status(404).json({ msg: "User does not exist", code: 404 });
        }

        res.json({ msg: "User deleted" });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/users-with-posts', async (req, res) => {
    try {
        let usersWithPosts = await User.find().populate('post').lean();
        res.json(usersWithPosts);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// router.post('/login', async (req, res) => {
//     try {
//         const { username, password } = req.body;
//         console.log("Received login request with username:", username, "and password:", password);

//         // Find the user by username
//         const user = await User.findOne({ username });
//         console.log("Retrieved user from database:", user);

//         if (!user) {
//             console.log("User not found in the database");
//             return res.status(404).json({ msg: 'Invalid username or password' });
//         }

//         console.log("Retrieved hashed password from the database:", user.password);

//         // Compare the plain text password from the request with the hashed password stored in the database
//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         console.log("Password comparison result:", isPasswordValid);
//         if (!isPasswordValid) {
//             return res.status(401).json({ msg: 'Invalid username or password' });
//         }

//         if (!user.isVerified) {
//             return res.status(401).json({ msg: 'Please verify your email before logging in.' });
//         }        

//         const payload = { userId: user._id, role: user.role, userEmail: user.email, };
//         const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

//         if (isPasswordValid) {
//             // Passwords match, handle successful login
//             // Optionally, you can include user details in the response
//             res.json({ success: true, msg: 'Login successful', user, token });
//         } else {
//             // Passwords don't match, handle unsuccessful login
//             console.log("Password is invalid");
//             res.status(401).json({ msg: 'Invalid username or password' });
//         }
//     } catch (error) {
//         console.error("Error occurred during login:", error);
//         res.status(500).json({ msg: 'Internal server error occurred' });
//     }
// });

// Admin sign-in endpoint
router.post('/admin/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if the user is an admin
        if (!user.isAdmin) {
            return res.status(403).json({ msg: 'You are not authorized to sign in' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create and sign a JWT token
        const payload = { userId: user._id, isAdmin: user.isAdmin, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });  // Replace 'your_jwt_secret' with your actual secret key

        // Respond with the JWT token
        res.json({ msg: 'Sign-in successful', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired verification token.' });
        }

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        res.json({ msg: 'Email verified successfully!' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});



// User Registration Route
router.post("/users", async (req, res) => {
    try {
        const { username, email, phoneNumber, password, role } = req.body;

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        // Check if email is already used
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: "Email is already registered." });
        }

        // Password validation
        const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long and contain at least one special character."
            });
        }

        // Log password length before hashing for debugging
        console.log("Password length during sign-up:", password.length);

        const verificationToken = crypto.randomBytes(32).toString("hex");

       // Hash password before saving
        const salt = await bcrypt.genSalt(10); // Adjust salt rounds as needed
        const hashedPassword = await bcrypt.hash(password, salt);

        // Log password before and after hashing for debugging
        console.log("Password before hashing:", password);
        console.log("Hashed password:", hashedPassword);

        // Create and save the new user
        const user = new User({
            username,
            email: email.toLowerCase(),
            phoneNumber,
            password,  // Save hashed password
            role,
            isVerified: false,
            verificationToken
        });

        await user.save();

        // Send verification email
        const verificationLink = `${process.env.CLIENT_URL}/auth/verify-email?token=${verificationToken}`;
        const html = `
            <h3>Verify your email</h3>
            <p>Click the link below to verify your email:</p>
            <a href="${verificationLink}">${verificationLink}</a>
        `;
        await sendEmail(email, "Verify your email", html);

        res.status(201).json({ msg: "User registered. Please check your email to verify your account." });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// User Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("Received login request with username:", username, "and password:", password);

        // Find the user by username
        const user = await User.findOne({ username });
        console.log("Retrieved user from database:", user);

        if (!user) {
            console.log("User not found in the database");
            return res.status(404).json({ msg: 'Invalid username or password' });
        }

        console.log("Retrieved hashed password from the database:", user.password);

        // Compare the plain text password from the request with the hashed password stored in the database
        // const isPasswordValid = await bcrypt.compare(password, user.password);
        const isPasswordValid = await bcrypt.compare(password.trim(), user.password.trim());

        console.log("Entered password:", password);
        console.log("Stored hashed password:", user.password);
        console.log("Password comparison result:", isPasswordValid);

        console.log(`Login: Username=${username}, Entered Password=${password}`);
        console.log(`Stored Hashed Password=${user.password}`);

        if (!isPasswordValid) {
            return res.status(401).json({ msg: 'Invalid username or password' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ msg: 'Please verify your email before logging in.' });
        }

        const payload = { userId: user._id, role: user.role, userEmail: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ success: true, msg: 'Login successful', user, token });
    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).json({ msg: 'Internal server error occurred' });
    }
});

// async function testHashingAndComparison() {
//   const password = 'wisdompandovic@';

//   // Hash the password
//   const hashedPassword = await bcrypt.hash(password, 10);
//   console.log('Hashed password:', hashedPassword);

//   // Compare the entered password with the hashed password
//   const isMatch = await bcrypt.compare(password, hashedPassword);
//   console.log('Password comparison result:', isMatch); // Should return true
// }

// testHashingAndComparison();

module.exports = router;
