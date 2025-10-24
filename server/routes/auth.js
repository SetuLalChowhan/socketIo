import express from "express";
import { register, login } from "../controllers/authController.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.post("/register", register);
router.post("/login", login);

export default router;
