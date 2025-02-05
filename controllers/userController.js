import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";  // Đổi tên lại cho dễ đọc
import validator from "validator";

// Hàm tạo JWT token với thời gian hết hạn
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Đăng nhập người dùng
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        const token = createToken(user._id);
        return res.json({ success: true, token });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Đăng ký người dùng
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Kiểm tra email đã tồn tại chưa
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        // Kiểm tra email hợp lệ
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        // Kiểm tra độ dài mật khẩu
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        // Hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo người dùng mới
        const newUser = new userModel({ name, email, password: hashedPassword });
        const user = await newUser.save();

        // Tạo token
        const token = createToken(user._id);
        return res.status(201).json({ success: true, token });

    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { loginUser, registerUser };


//req: đối tượng yêu cầu từ client (đối tượng request), chứa các thông tin HTTP, URL, các phương thức HTTP (GET, POST, PUT, DELETE), headers, body, query, params
//res: đối tượng trả về cho client (một đối tượng response)