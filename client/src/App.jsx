import React, { useState, useEffect, useRef } from "react";
import { Send, LogOut, MessageSquare, Trash2, Users } from "lucide-react"; // Icons
import io from "socket.io-client"; // Socket.io for real-time messaging

// API URLs
const API_URL = "http://localhost:5000/api"; // Backend API
const SOCKET_URL = "http://localhost:5000"; // Socket.io server URL

function App() {
  // ------------------ STATE VARIABLES ------------------
  const [user, setUser] = useState(null); // Stores logged-in user info
  const [token, setToken] = useState(null); // Stores JWT token
  const [authMode, setAuthMode] = useState("login"); // Toggle between login/register
  const [chats, setChats] = useState([]); // List of chats
  const [activeChat, setActiveChat] = useState(null); // Currently opened chat
  const [messages, setMessages] = useState([]); // Messages of the active chat
  const [newMessage, setNewMessage] = useState(""); // New message input
  const [showUserList, setShowUserList] = useState(false); // Show users for new chat
  const [users, setUsers] = useState([]); // List of all users for starting new chat
  const socketRef = useRef(null); // Socket.io reference
  const messagesEndRef = useRef(null); // Scroll to bottom reference

  // Form data for login/register
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  console.log(socketRef.current); // Debugging socket connection

  // ------------------ USE EFFECTS ------------------

  // On component mount, check local storage for token & user
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Initialize socket and fetch chats when user & token are available
  useEffect(() => {
    if (token && user) {
      fetchChats();
      initializeSocket();
    }
    // Disconnect socket on component unmount
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token, user]);

  // Handle incoming & outgoing messages via socket
  useEffect(() => {
    if (socketRef.current && user) {
      // Remove old listeners to prevent duplicates
      socketRef.current.off("receive_message");
      socketRef.current.off("message_sent");

      // Listener for messages received from other users
      socketRef.current.on("receive_message", (message) => {
        if (activeChat && message.chatId === activeChat._id) {
          setMessages((prev) => [...prev, message]); // Add message to current chat
        }
        fetchChats(); // Refresh chat list to show last message
      });

      // Listener for messages sent by this user
      socketRef.current.on("message_sent", (message) => {
        if (activeChat && message.chatId === activeChat._id) {
          setMessages((prev) => [...prev, message]);
        }
        fetchChats(); // Refresh chat list
      });
    }
  }, [activeChat, user]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ------------------ SOCKET.IO ------------------
  const initializeSocket = () => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"], // Use WebSocket transport
      reconnection: true, // Reconnect automatically if disconnected
    });

    socketRef.current.on("connect", () => {
      if (user) {
        socketRef.current.emit("join", user._id); // Join user's socket room
      }
    });
  };

  // ------------------ AUTHENTICATION ------------------
  const handleAuth = async () => {
    const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        // Save token & user info in localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setFormData({ name: "", email: "", password: "" }); // Clear form
      } else {
        alert(data.message); // Show error message
      }
    } catch (err) {
      alert("Authentication failed");
    }
  };

  // ------------------ FETCH CHATS & USERS ------------------
  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_URL}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setChats(data);
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // ------------------ CHAT FUNCTIONS ------------------
  // Select a chat to view messages
  const selectChat = async (chat) => {
    setActiveChat(chat);
    try {
      const res = await fetch(`${API_URL}/chat/${chat._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // Send a message
  const sendMessage = () => {
    if (!newMessage.trim() || !activeChat) return;

    const receiverId = activeChat.participants.find((p) => p !== user._id);

    socketRef.current.emit("send_message", {
      senderId: user._id,
      receiverId,
      text: newMessage,
      chatId: activeChat._id,
    });

    setNewMessage(""); // Clear input after sending
  };

  // Delete a chat
  const deleteChat = async (chatId, e) => {
    e.stopPropagation(); // Prevent chat selection
    if (!confirm("Delete this chat?")) return;

    try {
      await fetch(`${API_URL}/chat/${chatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (activeChat?._id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
      fetchChats();
    } catch (err) {
      alert("Failed to delete chat");
    }
  };

  // Start a new chat with a user
  const startNewChat = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const chat = await res.json();
      setShowUserList(false);
      fetchChats();
      selectChat(chat);
    } catch (err) {
      alert("Failed to start chat");
    }
  };

  // ------------------ LOGOUT ------------------
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setChats([]);
    setActiveChat(null);
    setMessages([]);
    if (socketRef.current) socketRef.current.disconnect(); // Disconnect socket
  };

  // ------------------ RENDER LOGIN / REGISTER ------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          {/* App Icon */}
          <div className="flex items-center justify-center mb-6">
            <MessageSquare className="w-12 h-12 text-blue-500" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            {authMode === "login" ? "Welcome Back" : "Create Account"}
          </h1>

          {/* Form */}
          <div className="space-y-4">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              onKeyPress={(e) => e.key === "Enter" && handleAuth()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleAuth}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              {authMode === "login" ? "Login" : "Sign Up"}
            </button>
          </div>

          {/* Toggle login/register */}
          <p className="text-center mt-6 text-gray-600">
            {authMode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
              className="text-blue-500 font-semibold hover:underline"
            >
              {authMode === "login" ? "Sign Up" : "Login"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ------------------ RENDER CHAT INTERFACE ------------------
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* User Info */}
        <div className="p-4 border-b border-gray-200 bg-blue-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-blue-500 rounded-full flex items-center justify-center font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold">{user?.name}</h2>
                <p className="text-xs opacity-90">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="hover:bg-blue-600 p-2 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={() => {
              setShowUserList(!showUserList);
              if (!showUserList) fetchUsers();
            }}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => selectChat(chat)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition ${
                activeChat?._id === chat._id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">Chat</h3>
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteChat(chat._id, e)}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800">Chat</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => {
                const isSender =
                  msg.sender === user._id || msg.sender?._id === user._id;
                return (
                  <div
                    key={idx}
                    className={`flex ${
                      isSender ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        isSender
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-800 border border-gray-200"
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} /> {/* Scroll anchor */}
            </div>

            {/* Message Input */}
            <div className="bg-white p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Placeholder when no chat is selected
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-600">
                Select a chat to start messaging
              </h2>
            </div>
          </div>
        )}
      </div>

      {/* User List Modal for starting new chat */}
      {showUserList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-96 flex flex-col">
            <h3 className="text-xl font-bold mb-4">Select User to Chat</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {users.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No users available
                </p>
              ) : (
                users.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => startNewChat(u._id)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition border border-gray-200"
                  >
                    <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{u.name}</h4>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowUserList(false)}
              className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
