import express from 'express';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import { loginUser, registerUser } from '../controllers/userController.js';

const userRouter = express.Router();

// Lấy thông tin user từ token
userRouter.get('/profile', async (req, res) => {
	try {
		const token = req.headers.token;
		if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' });
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
		const user = await User.findById(decoded.id);
		if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
		res.json({ user });
	} catch (err) {
		res.status(400).json({ message: 'Token không hợp lệ' });
	}
});

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);

export default userRouter;