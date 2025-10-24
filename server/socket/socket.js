// socket/socket.js
import { Server } from "socket.io";
import Message from "../models/Message.js";

const onlineUsers = {};

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { 
      origin: "http://localhost:5173", 
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // Add user to online users
    socket.on("join", (userId) => {
      onlineUsers[userId] = socket.id;
      console.log("📋 Online users:", onlineUsers);
      
      // Broadcast online status to all users
      socket.broadcast.emit("user_online", userId);
    });

    // Send message
    socket.on("send_message", async ({ senderId, receiverId, text, chatId }) => {
      try {
        console.log("📨 Received message:", { senderId, receiverId, text, chatId });
        
        const message = await Message.create({ 
          chatId, 
          sender: senderId, 
          text 
        });

        // Populate the message with sender info
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name email')
          .exec();

        console.log("💾 Message saved to DB:", populatedMessage);

        // Send to receiver if online
        const receiverSocket = onlineUsers[receiverId];
        if (receiverSocket) {
          console.log("📤 Sending to receiver:", receiverId, "socket:", receiverSocket);
          io.to(receiverSocket).emit("receive_message", populatedMessage);
        } else {
          console.log("❌ Receiver offline:", receiverId);
        }

        // Send confirmation to sender
        const senderSocket = onlineUsers[senderId];
        if (senderSocket) {
          console.log("✅ Confirming to sender:", senderId);
          io.to(senderSocket).emit("message_sent", populatedMessage);
        }

      } catch (err) {
        console.error("❌ Error sending message:", err.message);
      }
    });

    // Handle typing events
    socket.on("typing_start", ({ chatId, userId }) => {
      socket.to(chatId).emit("typing_start", { userId });
    });

    socket.on("typing_stop", ({ chatId, userId }) => {
      socket.to(chatId).emit("typing_stop", { userId });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
      for (const [userId, id] of Object.entries(onlineUsers)) {
        if (id === socket.id) {
          delete onlineUsers[userId];
          // Broadcast offline status
          socket.broadcast.emit("user_offline", userId);
          console.log("📋 Updated online users:", onlineUsers);
          break;
        }
      }
    });
  });
};