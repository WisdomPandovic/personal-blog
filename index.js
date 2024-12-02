// // for local
// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require("cors");
// const app = express()
// const path = require('path')

// const PORT = process.env.PORT || 3007;
// // const DB_URL = "mongodb://127.0.0.1:27017/imgur-blog"
// const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/imgur-blog";
// const routes = require('./routes/app')

// mongoose.connect(DB_URL,{useNewUrlParser:true,useUnifiedTopology:true})
// mongoose.connection.on('open',()=>console.log("Server connected"))
// mongoose.connection.on('err',(err)=>console.log(err))

// app.use(cors());
// app.use('/postimage', express.static(path.join(__dirname,'public',"postimage")))
// app.use(express.json())
// app.use(express.urlencoded({extended:true}))
// app.use(routes)

// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`App is running on http://0.0.0.0:${PORT}`);
//   });
  

// for production

// Load environment variables from .env file if available
// Load environment variables from .env file if available
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const userRoutes = require('./routes/routes/user'); 
const postRoutes = require('./routes/routes/post'); 
const categoryRoutes = require('./routes/routes/category'); 
const contactRoutes = require('./routes/routes/contact'); 
const subscriptionRoutes = require('./routes/routes/subscription'); 
const searchRoutes = require('./routes/routes/search'); 

const app = express();

// Use environment variables for configuration
const PORT = process.env.PORT || 3007;
const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/camila-blog";
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret';

// Connect to MongoDB
mongoose.connect(DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,  // Use TLS for secure connections
  tlsAllowInvalidCertificates: true  // Allow invalid certificates
});
mongoose.connection.on('open', () => console.log("Server connected"));
mongoose.connection.on('error', (err) => console.log(err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: DB_URL,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 3600000 // 1 hour
    }
}));

// Static files
app.use('/postimage', express.static(path.join(__dirname, 'public', 'postimage')));

// Routes
app.use('/api', userRoutes);
app.use('/api', postRoutes);
app.use('/api', categoryRoutes);
app.use('/api', contactRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', searchRoutes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`App is running on http://0.0.0.0:${PORT}`);
});
