import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],
  lastMessage: { type: String },
}, { timestamps: true });

export default mongoose.model("Chat", ChatSchema);