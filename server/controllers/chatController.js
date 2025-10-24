import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
// Create or get chat between two users
export const accessChat = async (req, res) => {
  const { userId } = req.body; // user to chat with
  const myId = req.user.id;

  // Check if userId exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check if chat already exists
  let chat = await Chat.findOne({
    participants: { $all: [myId, userId] }
  });

  if (!chat) {
    chat = await Chat.create({ participants: [myId, userId] });
  }

  res.status(200).json(chat);
};

// Get chat list for user
export const fetchChats = async (req, res) => {
  const myId = req.user.id;
  const chats = await Chat.find({ participants: myId }).sort({ updatedAt: -1 });
  res.status(200).json(chats);
};

// Get message history
export const fetchMessages = async (req, res) => {
  const { chatId } = req.params;
  const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
  res.status(200).json(messages);
};

export const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if the user is a participant
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: "You are not allowed to delete this chat" });
    }

    // Delete messages associated with chat
    await Message.deleteMany({ chatId });

    // Delete chat
    await Chat.findByIdAndDelete(chatId);

    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
