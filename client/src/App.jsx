import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
});

export default function App() {
  const [userId, setUserId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
   
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected");
      
    });

    socket.on("receive_message", (data) => {
      console.log("📩 Received:", data);
      setChat((prev) => [...prev, data]);
    });

    socket.on("message_sent", (data) => {
      console.log("✅ Message sent confirmation");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive_message");
      socket.off("message_sent");
    };
  }, []);

  // Join when userId is set
  useEffect(() => {
    if (userId ) {
      socket.emit("join", userId);
      console.log("🔗 Joined as:", userId);
    }
  }, [userId, connected]);

  const sendMessage = () => {
    if (message.trim() && receiverId && userId) {
      const msgData = {
        senderId: userId,
        receiverId,
        text: message,
      };
      
      console.log("📤 Sending:", msgData);
      socket.emit("send_message", msgData);
      
      // Add to your own chat
      setChat((prev) => [...prev, { senderId: userId, text: message }]);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-2">💬 Private Chat</h1>
    

      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          placeholder="Your User ID (e.g., 123)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Receiver ID (e.g., 321)"
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <div className="w-96 h-96 overflow-y-auto bg-white shadow rounded p-4 mb-4">
        {chat.length === 0 ? (
          <p className="text-gray-400 text-center">No messages yet...</p>
        ) : (
          chat.map((msg, idx) => (
            <p
              key={idx}
              className={`p-2 my-1 rounded ${
                msg.senderId === userId ? "bg-blue-100 text-right" : "bg-green-100"
              }`}
            >
              <b>{msg.senderId === userId ? "You" : msg.senderId}:</b> {msg.text}
            </p>
          ))
        )}
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type message..."
          className="border p-2 rounded w-60"
         
        />
        <button
          onClick={sendMessage}
          className={`px-4 py-2 rounded text-white bg-black`}

        >
          Send
        </button>
      </div>
    </div>
  );
}