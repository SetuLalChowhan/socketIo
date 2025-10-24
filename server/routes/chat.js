import express from "express";
import { accessChat, deleteChat, fetchChats, fetchMessages } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, accessChat);
router.get("/", protect, fetchChats);
router.get("/:chatId/messages", protect, fetchMessages);
router.delete("/:chatId", protect, deleteChat);
export default router;
