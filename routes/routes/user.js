require('dotenv').config();

const User = require('../../models/user');
const UAParser = require('ua-parser-js');
const mongoose = require('mongoose');
const multer = require("multer");
const bcrypt = require('bcryptjs');
const authenticate = require('../../middleware/authenticate')
const authorizeRoles = require('../../middleware/authorize')
const isAdmin = require('../../middleware/admin');
const Post = require("../../models/post");
const Role = require('../../models/role');
const Transaction = require('../../models/transaction'); 
const PageView = require('../../models/PageView');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require("../../utils/emailService");
const saveActivity = require('../../utils/saveActivity');

const storage = multer.diskStorage({
    destination: (reg, file, cb) => {
        //let _dir = path.join(__dirname, "../../public/postimage");
        //cb(null, _dir);
        // cb(null, )
        cb(null, "public/postimage")

    },
    filename: (reg, file, cb) => {
        let filename = file.originalname.toLowerCase();
        cb(null, filename);
    },
});

const postimage = multer({ storage: storage });

router.get('/', (req, res) => {
    res.json({ msg: "This is my user index route" });
});

// router.get('/users', async (req, res) => {
//     try {
//         let users = await User.find().lean();
//         res.json(users);
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// });

router.get('/users', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      const search = req.query.search?.toString().trim() || '';
      const role = req.query.role?.toString().trim();
      const sortBy = req.query.sortBy?.toString() || 'createdAt';
      const order = req.query.order === 'asc' ? 1 : -1;
  
      const filter = {};
  
      // 🔍 Search by name or email (case-insensitive)
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
  
      // 🔒 Filter by role if specified
      if (role) {
        filter.roleName = role;
      }
  
      const [users, total] = await Promise.all([
        User.find(filter)
          .sort({ [sortBy]: order })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter)
      ]);
  
      const totalPages = Math.ceil(total / limit);
  
      res.json({
        users,
        total,
        page,
        totalPages
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: err.message });
    }
  });   

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

router.post('/admin/signup', authenticate, isAdmin, async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, phoneNumber, roleTitle } = req.body;

        // Check if email or username already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ msg: 'Email or Username already exists' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        // Validate password format
        const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long and contain at least one special character."
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Find the role based on the title (e.g., 'admin')
        const role = await Role.findOne({ title: roleTitle });
        if (!role) {
            return res.status(400).json({ msg: 'Role not found' });
        }

        // Create a new user with the selected role
        const newUser = new User({
            firstName,
            lastName,
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
            phoneNumber,
            role: role._id,  // Reference to the Role
            roleName: role.title, // Set the roleName based on the role's title
            hasAdminAccess: true,
        });

        // Save the new user
        await newUser.save();
        res.status(201).json({ msg: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// router.patch('/users/:id', async (req, res) => {
//     try {
//         let { id } = req.params;
//         let user = await User.findById(id);

//         if (!user) return res.status(404).json({ msg: "User does not exist", code: 404 });

//         // Update only the fields provided in the request body
//         Object.assign(user, req.body);

//         await user.save();

//         res.json(user);
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// });

router.patch('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ msg: "User does not exist", code: 404 });
        }

        // Update only the fields provided in the request body
        Object.assign(user, req.body);
        await user.save();

        res.status(200).json({
            msg: "User profile updated successfully",
            code: 200,
            user,
        });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({
            msg: "Server error",
            code: 500,
            error: err.message,
        });
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

// Admin sign-in endpoint
router.post('/admin/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email }).populate('role');
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

         // Log full user data for debugging
    console.log("User found:", {
        email: user.email,
        roleName: user.roleName,
        status: user.status,
        hasAdminAccess: user.hasAdminAccess,
      });

         // Check if the user is blocked
         if (user.status === 'blocked') {
            console.log("User is blocked.");
            return res.status(403).json({ msg: 'Your account is blocked, please contact support.' });
        }

        // Check if the user is an admin
        if (!user.hasAdminAccess) {
            return res.status(403).json({ msg: 'You are not authorized to sign in' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        user.lastLogin = new Date();
        await user.save();

        // Create and sign a JWT token
        const payload = {
            userId: user._id,
            hasAdminAccess: user.hasAdminAccess,  // You might not need this anymore
            role: user.role,        // Role ObjectId reference
            roleName: user.roleName, // Include roleName here for easier admin check
            profilePhoto: user.profileImage,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });  // Replace 'your_jwt_secret' with your actual secret key

        // Respond with the JWT token
        // res.json({ msg: 'Sign-in successful', token });
        res.json({
            msg: 'Sign-in successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
                role: payload.role, // includes title + permissions
                roleName: user.roleName,
            },
        });
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

        // Check if the user is already verified
        if (user.isVerified === true) {
            return res.status(200).json({ msg: "Email already verified." });
        }

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        res.json({ msg: 'Email verified successfully!' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

router.post("/users", async (req, res) => {
    try {
        const { firstName, lastName, username, email, phoneNumber, password, role } = req.body;

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

        // Automatically assign "user" role
        const userRole = await Role.findOne({ title: 'user' });
        if (!userRole) return res.status(400).json({ msg: 'Default role "user" not found' });

        // Create and save the new user
        const user = new User({
            firstName,
            lastName,
            username,
            email: email.toLowerCase(),
            phoneNumber,
            password: hashedPassword,  // Save hashed password
            role: userRole._id,
            roleName: userRole.title,
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

         // Check if the user is blocked
         if (user.status === 'blocked') {
            console.log("User is blocked.");
            return res.status(403).json({ msg: 'Your account is blocked, please contact support.' });
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

        // --------- Detect device from User-Agent ---------
        const parser = new UAParser(req.headers['user-agent']);
        const deviceType = parser.getDevice().type || "desktop"; // if undefined, assume desktop
        let device = "Desktop";
        if (deviceType === "mobile") device = "Mobile";
        if (deviceType === "tablet") device = "Tablet";

        // --------- Update user's deviceType field ---------
        user.deviceType = device;
        user.lastLogin = new Date();
        await user.save(); // Save updated deviceType

        const payload = { userId: user._id, role: user.role, userEmail: user.email, userName: user.username, firstName: user.firstName, lastName: user.lastName };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ success: true, msg: 'Login successful', user, token });
    } catch (error) {
        console.error("Error occurred during login:", error);
        res.status(500).json({ msg: 'Internal server error occurred' });
    }
});

router.get("/user/savedAddress/:userId", async (req, res) => {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ savedAddresses: user.savedAddresses });
});

router.post("/user/:userId/address", async (req, res) => {
    const { address, postalCode, phoneNumber, label } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.savedAddresses.push({ address, postalCode, phoneNumber, label });
    await user.save();
    res.json({ message: "Address added", savedAddresses: user.savedAddresses });
});

router.put("/user/:userId/address/:addressId", async (req, res) => {
    const { address, postalCode, phoneNumber, label } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const addr = user.savedAddresses.id(req.params.addressId);
    if (!addr) return res.status(404).json({ error: "Address not found" });

    addr.set({ address, postalCode, phoneNumber, label });
    await user.save();
    res.json({ message: "Address updated", savedAddresses: user.savedAddresses });
});

router.delete("/user/:userId/address/:addressId", async (req, res) => {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.savedAddresses = user.savedAddresses.filter(a => a._id.toString() !== req.params.addressId);
    await user.save();
    res.json({ message: "Address deleted", savedAddresses: user.savedAddresses });
});

// Upload Admin Profile Photo
// router.patch('/admin/:id/photo', postimage.single('photo'), async (req, res) => {
//     try {
//         const { id } = req.params;
//         const user = await User.findById(id);

//         if (!user) {
//             return res.status(404).json({ msg: 'User not found' });
//         }

//         let photoUrl;

//         if (req.file) {
//             // If a file is uploaded
//             photoUrl = `${req.protocol}://${req.get('host')}/postimage/${req.file.filename}`;
//         } else if (req.body.profileImage) {
//             // If a URL is sent
//             photoUrl = req.body.profileImage;
//         } else {
//             return res.status(400).json({ msg: 'No photo uploaded or URL provided' });
//         }

//         user.profileImage = photoUrl;
//         await user.save();

//          // ✅ Save the activity after successful profile image update
//          await saveActivity({
//             userId: user._id,
//             action: 'Updated profile photo',
//             // message: `User updated their profile photo to ${photoUrl}`,
//             message: 'User updated their profile photo',   // Add a descriptive message
//             metadata: { profileImage: photoUrl, username: username },
//           });

//         res.json({ msg: 'Profile photo updated successfully', profileImage: photoUrl });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ msg: 'Server error', error: err.message });
//     }
// });

router.patch('/admin/:id/photo', postimage.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body; // Extract username from request body

        // Find the user by ID
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Determine the photo URL (either from file upload or direct URL)
        let photoUrl;

        if (req.file) {
            // File uploaded via multer
            photoUrl = `${req.protocol}://${req.get('host')}/postimage/${req.file.filename}`;
        } else if (req.body.profileImage) {
            // URL provided directly
            photoUrl = req.body.profileImage;
        } else {
            return res.status(400).json({ msg: 'No photo uploaded or URL provided' });
        }

        // Update the user's profile image and username (if provided)
        user.profileImage = photoUrl;
        if (username) {
            user.username = username; // Update username only if provided
        }
        await user.save();

        // Save the activity log
        await saveActivity({
            userId: user._id,
            action: 'Updated profile photo',
            message: `${user.username || username} updated their profile photo`,
            metadata: {
                profileImage: photoUrl,
                username: user.username || username,
            },
        });

        // Respond with success
        res.json({ msg: 'Profile photo updated successfully', profileImage: photoUrl });
    } catch (err) {
        console.error("Error updating profile photo:", err.message);
        res.status(500).json({ msg: "Server error", error: err.message });
    }
});

router.get('/admin-profile', authenticate, authorizeRoles('admin', 'manager', 'moderator', 'support', 'editor', 'guest'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id); // Use userId from the token
        console.log('Decoded JWT payload:', req.user);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Send user details including profile photo
        res.json({
            user: {
                userId: user.id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                lastName: user.lastName,
                firstName: user.firstName,
                phoneNumber: user.phoneNumber,
                role: user.role,
                roleName: user.roleName,
                savedAddresses: user.savedAddresses,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

router.get('/getDeviceBreakdown', async (req, res) => {
    const breakdown = await User.aggregate([
        {
            $group: {
                _id: "$deviceType",
                count: { $sum: 1 }
            }
        }
    ]);

    const total = breakdown.reduce((acc, curr) => acc + curr.count, 0);

    const formatted = breakdown.map(item => ({
        device: item._id || "Unknown",
        percentage: Math.round((item.count / total) * 100)
    }));

    res.json(formatted);
});

router.post('/track-pageview', async (req, res) => {
    try {
        const { pageUrl, userId, ipAddress } = req.body;

        await PageView.create({
            pageUrl,
            userId,
            ipAddress,
        });

        res.status(201).json({ message: 'Page view tracked successfully' });
    } catch (error) {
        console.error('Error tracking pageview:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/get-pageviews', async (req, res) => {
    try {
        const pageViews = await PageView.aggregate([
            {
                $group: {
                    _id: "$pageUrl",
                    views: { $sum: 1 },
                    uniqueVisitors: { $addToSet: "$ipAddress" } // Assuming IP addresses as unique visitors
                }
            },
            {
                $project: {
                    pageUrl: "$_id",
                    views: 1,
                    uniqueVisitorCount: { $size: "$uniqueVisitors" },
                    _id: 0
                }
            }
        ]);

        res.json(pageViews);
    } catch (error) {
        console.error('Error getting page views:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/update-password', authenticate, isAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Fetch the user from DB using the ID from JWT
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Check if user is admin (optional: only allow admin users to change password here)
        if (!user.hasAdminAccess) return res.status(403).json({ msg: 'Access denied. Not an admin.' });

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Current password is incorrect' });

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        // Update and save
        user.password = hashed;
        await user.save();

        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error('Password update error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// router.put('/admin/block/:id', authenticate, isAdmin, async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Validate ObjectId format before querying
//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             return res.status(400).json({ message: 'Invalid User ID format' });
//         }

//         // Find user by ID
//         const user = await User.findById(id);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         // Check if the user is already blocked
//         if (user.status === 'blocked') {
//             return res.status(400).json({ message: 'User is already blocked' });
//         }

//         // Update user status to 'blocked'
//         user.status = 'blocked';
//         await user.save();

//         res.status(200).json({ message: 'User has been blocked successfully' });

//     } catch (err) {
//         console.error('Error blocking user:', err);
//         res.status(500).json({ error: 'Internal Server Error', message: err.message });
//     }
// });

router.put('/admin/block/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format before querying
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid User ID format' });
        }

        // Find user by ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is currently blocked or active and toggle status
        if (user.status === 'blocked') {
            // Unblock the user
            user.status = 'active';
            await user.save();
            return res.status(200).json({ message: 'User has been unblocked successfully' });
        } else {
            // Block the user
            user.status = 'blocked';
            await user.save();
            return res.status(200).json({ message: 'User has been blocked successfully' });
        }

    } catch (err) {
        console.error('Error updating user status:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

router.get('/user/username/:username', async function (req, res) {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({ message: "Username is required." });
        }

        const user = await User.findOne({ username })
            .populate('role')         // populate role info (assuming Role model)
            .populate('posts')        // populate user's created posts
            .populate('paidPosts')    // populate user's paid posts
            .select('-password -verificationToken -verificationTokenExpires'); // exclude sensitive fields

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });

        res.status(200).json({ ...user.toObject(), transactions });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: "Internal server error." });
    }
});

router.post('/create/user', authenticate, isAdmin, async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, phoneNumber, roleTitle, savedAddresses } = req.body;

        // Check if email or username already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ msg: 'Email or Username already exists' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        // Validate password format
        const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long and contain at least one special character."
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Find the role based on the title (e.g., 'admin')
        const role = await Role.findOne({ title: roleTitle });
        if (!role) {
            return res.status(400).json({ msg: 'Role not found' });
        }

        // Create a new user with the selected role
        const newUser = new User({
            firstName,
            lastName,
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
            phoneNumber,
            role: role._id,  // Reference to the Role
            roleName: role.title, // Set the roleName based on the role's title
            hasAdminAccess: true,
            savedAddresses: savedAddresses || [],
        });

        // Save the new user
        await newUser.save();
        res.status(201).json({ msg: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// POST /admin/users/bulk-delete
router.post('/users/bulk-delete', authenticate, isAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
  
      // Validate input
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid or empty user IDs array' 
        });
      }
  
      // Validate all IDs are valid MongoDB ObjectIds
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      
      if (validIds.length === 0) {
        return res.status(400).json({ 
          error: 'No valid user IDs provided' 
        });
      }
  
      // Delete users and related records
      const result = await User.deleteMany({ _id: { $in: validIds } });
      
      res.status(200).json({ 
        message: `${result.deletedCount} user(s) deleted successfully`,
        deletedCount: result.deletedCount
      });
  
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ 
        error: 'Failed to delete users',
        details: error.message 
      });
    }
  });

router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'User not found.' });

    const token = crypto.randomBytes(32).toString('hex');

    // ✅ Log before saving
    console.log("🔑 Generated token:", token);
    // console.log("🕒 Expires:", new Date(expires).toISOString());

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60); 
    await user.save();

    // ✅ Confirm it saved
    console.log("💾 Token saved to DB.");
    // const resetUrl = `http://localhost:3000/auth/reset-password/${token}`;
    const resetUrl = `https://chilla-sweella-personal-blog.vercel.app/auth/reset-password/${token}`;
    console.log('🔗 Reset URL:', resetUrl);

    const html = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="color: blue;">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await sendEmail(user.email, 'Password Reset', html);
    res.status(200).json({ message: 'Reset email sent.' });
  } catch (err) {
    console.error('❌ Error during password reset request:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// router.post('/reset-password/:token', async (req, res) => {
//   const { token } = req.params;
//   const { newPassword } = req.body;

//   try {
//     const user = await User.findOne({
//       resetPasswordToken: token,
//       resetPasswordExpires: { $gt: Date.now() } // still valid
//     });

//     if (!user)
//       return res.status(400).json({ message: 'Invalid or expired token.' });

//     // Update password
//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(newPassword, salt);
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;
//     await user.save();

//     res.status(200).json({ message: 'Password has been reset.' });
//   } catch (err) {
//     console.error("Error during password reset:", err);
//     res.status(500).json({ message: 'Server error.' });
//   }
// });

router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
  
    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }
  
    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
  
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }
  
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
  
      res.status(200).json({ message: 'Password has been reset.' });
    } catch (err) {
      console.error('Error during password reset:', err);
      res.status(500).json({ message: 'Server error.' });
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
