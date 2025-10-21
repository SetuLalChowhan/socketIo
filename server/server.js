// import express from "express";
// import http from "http";
// import { Server } from "socket.io";
// import cors from "cors";

// const app = express();
// const PORT = 5000;

// // Middleware
// app.use(cors({ origin: "http://localhost:5173", credentials: true }));
// app.use(express.json());

// // Create HTTP server
// const server = http.createServer(app);

// // Initialize Socket.IO
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// // Socket events
// io.on("connection", (socket) => {
//   console.log("✅ User connected:", socket.id);

//   socket.on("send_message", (data) => {
//     console.log("💬 Message received:", data);
//     io.emit("receive_message", data);
//   });

//   socket.on("disconnect", () => {
//     console.log("❌ User disconnected:", socket.id);
//   });
// });

// // Start server
// server.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });



// example - 2 user to user private 

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const users = {};

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("join", (userId) => {
    users[userId] = socket.id;
    console.log("📋 Users online:", users);
  });

  socket.on("send_message", ({ senderId, receiverId, text }) => {
    console.log(`📨 Message from ${senderId} to ${receiverId}:`, text);

    const receiverSocketId = users[receiverId];
    const senderSocketId = users[senderId];

    // Send to receiver
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", {
        senderId,
        text,
      });
      console.log("✅ Sent to receiver");
    } else {
      console.log("❌ Receiver not found:", receiverId);
    }

    // Send confirmation back to sender
    if (senderSocketId) {
      io.to(senderSocketId).emit("message_sent", {
        senderId,
        receiverId,
        text,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    for (const [userId, id] of Object.entries(users)) {
      if (id === socket.id) {
        delete users[userId];
        console.log(`🗑️ Removed user: ${userId}`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});