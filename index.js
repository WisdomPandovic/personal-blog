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
// require('dotenv').config();

// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require("cors");
// const path = require('path');
// const cookieParser = require('cookie-parser');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const userRoutes = require('./routes/routes/user'); 
// const postRoutes = require('./routes/routes/post'); 
// const categoryRoutes = require('./routes/routes/category'); 
// const contactRoutes = require('./routes/routes/contact'); 
// const subscriptionRoutes = require('./routes/routes/subscription'); 
// const searchRoutes = require('./routes/routes/search'); 
// const paymentRoutes = require('./routes/routes/payment'); 
// const productRoutes = require('./routes/routes/product'); 
// const productPaymentRoutes = require('./routes/routes/productPayment')

// const app = express();

// // Use environment variables for configuration
// const PORT = process.env.PORT || 3007;
// const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/camila-blog";
// // const DB_URL = "mongodb://127.0.0.1:27017/camila-blog";
// const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret';

// // Connect to MongoDB
// mongoose.connect(DB_URL, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   tls: true,  // Use TLS for secure connections
//   tlsAllowInvalidCertificates: true  // Allow invalid certificates
// });
// mongoose.connection.on('open', () => console.log("Server connected"));
// mongoose.connection.on('error', (err) => console.log(err));

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(session({
//     secret: SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//         mongoUrl: DB_URL,
//         collectionName: 'sessions'
//     }),
//     cookie: {
//         secure: process.env.NODE_ENV === 'production',
//         httpOnly: true,
//         maxAge: 3600000 // 1 hour
//     }
// }));

// // Static files
// app.use('/postimage', express.static(path.join(__dirname, 'public', 'postimage')));

// // Routes
// app.use('/api', userRoutes);
// app.use('/api', postRoutes);
// app.use('/api', categoryRoutes);
// app.use('/api', contactRoutes);
// app.use('/api', subscriptionRoutes);
// app.use('/api', searchRoutes);
// app.use('/api', paymentRoutes);
// app.use('/api', productRoutes);
// app.use('/api', productPaymentRoutes);

// // Start server
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`App is running on http://0.0.0.0:${PORT}`);
// });


require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const { Server } = require('socket.io');

// Import routes
const userRoutes = require('./routes/routes/user'); 
const postRoutes = require('./routes/routes/post'); 
const categoryRoutes = require('./routes/routes/category'); 
const contactRoutes = require('./routes/routes/contact'); 
const subscriptionRoutes = require('./routes/routes/subscription'); 
const searchRoutes = require('./routes/routes/search'); 
const paymentRoutes = require('./routes/routes/payment'); 
const productRoutes = require('./routes/routes/product'); 
const productPaymentRoutes = require('./routes/routes/productPayment');

const app = express();
const server = http.createServer(app); // Use http server for both Express & Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Environment configs
const PORT = process.env.PORT || 3007;
const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/camila-blog";
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret';

// MongoDB
mongoose.connect(DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  tlsAllowInvalidCertificates: true
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
        maxAge: 3600000
    }
}));

// Static
app.use('/postimage', express.static(path.join(__dirname, 'public', 'postimage')));

// Routes
app.use('/api', userRoutes);
app.use('/api', postRoutes);
app.use('/api', categoryRoutes);
app.use('/api', contactRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', searchRoutes);
app.use('/api', paymentRoutes);
app.use('/api', productRoutes);
app.use('/api', productPaymentRoutes);

// 🧠 Live streaming logic
let liveStream = {
  isLive: false,
  adminSocketId: null,
};

// io.on("connection", (socket) => {
//     console.log("🔌 User connected:", socket.id);
  
//     // Admin starts stream
//     socket.on("admin-go-live", () => {
//       console.log("📡 Admin started streaming");
//       liveStream.isLive = true;
//       liveStream.adminSocketId = socket.id;
  
//       // Notify all users that live started
//       io.emit("live-started");
  
//       // Notify viewers to emit "watcher"
//       socket.broadcast.emit("broadcaster");
//     });
  
//     // Viewer wants to watch
//     socket.on("watcher", (viewerId) => {
//       console.log("👀 Watcher connected:", viewerId);
  
//       if (liveStream.adminSocketId) {
//         io.to(liveStream.adminSocketId).emit("watcher", viewerId);
//       }
//     });
  
//     // Admin sends offer to viewer
//     socket.on("offer", (id, description) => {
//         console.log("📨 Admin sending offer to viewer:", id);
//         socket.to(id).emit("offer", socket.id, description);
//       });            
  
//     // Viewer sends answer to admin
//     socket.on("answer", (id, description) => {
//       console.log("📨 Answer sent to", id);
//       socket.to(id).emit("answer", socket.id, description);
//     });
  
//     // ICE candidate exchange
//     socket.on("candidate", (id, candidate) => {
//       console.log("❄️ ICE candidate sent to", id);
//       socket.to(id).emit("candidate", socket.id, candidate);
//     });
  
//     // Admin ends stream manually
//     socket.on("admin-end-live", () => {
//       console.log("❌ Admin stopped streaming");
//       liveStream.isLive = false;
//       liveStream.adminSocketId = null;
//       io.emit("live-ended");
//     });
  
//     // Comments during live
//     socket.on("comment", (comment) => {
//       io.emit("new-comment", comment);
//     });
  
//     // On disconnect
//     socket.on("disconnect", () => {
//       console.log("❌ Disconnected:", socket.id);
  
//       // If admin disconnects, stop live
//       if (socket.id === liveStream.adminSocketId) {
//         liveStream.isLive = false;
//         liveStream.adminSocketId = null;
//         io.emit("live-ended");
//       }
  
//       // Inform peers to close connections
//       socket.broadcast.emit("disconnectPeer", socket.id);
//     });
//   }); 

// 🟢 Start server

io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // Admin starts stream
    socket.on("admin-go-live", () => {
        console.log("📡 Admin started streaming");
        liveStream.isLive = true;
        liveStream.adminSocketId = socket.id;

        // Notify all users that live started
        io.emit("live-started");
    });

    // Viewer wants to watch
    socket.on("watcher", (viewerId) => {
        console.log("👀 Watcher connected:", viewerId);

        if (liveStream.adminSocketId) {
            io.to(liveStream.adminSocketId).emit("watcher", viewerId);
        } else {
            socket.emit("error", "No active live stream.");
        }
    });

    // Admin sends offer to viewer
    socket.on("offer", (id, description) => {
        console.log("📨 Admin sending offer to viewer:", id);
        socket.to(id).emit("offer", socket.id, description);
    });

    // Viewer sends answer to admin
    socket.on("answer", (id, description) => {
        console.log("📨 Answer sent to", id);
        socket.to(id).emit("answer", socket.id, description);
    });

    // ICE candidate exchange
    socket.on("candidate", (id, candidate) => {
        console.log("❄️ ICE candidate sent to", id);
        socket.to(id).emit("candidate", socket.id, candidate);
    });

    // Admin ends stream manually
    socket.on("admin-stop-live", () => {
        console.log("❌ Admin stopped streaming");
        liveStream.isLive = false;
        liveStream.adminSocketId = null;
        io.emit("live-ended");
    });

    // On disconnect
    socket.on("disconnect", () => {
        console.log("❌ Disconnected:", socket.id);

        // If admin disconnects, stop live
        if (socket.id === liveStream.adminSocketId) {
            liveStream.isLive = false;
            liveStream.adminSocketId = null;
            io.emit("live-ended");
        }

        // Inform peers to close connections
        socket.broadcast.emit("disconnect-peer", socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`App with Socket.IO running on http://0.0.0.0:${PORT}`);
});
