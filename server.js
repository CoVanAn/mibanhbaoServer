import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./middleware/googleAuth.js";
import { connectDB } from "./config/db.js";
import productRouter from "./routes/productRoute.js";
import userRouter from "./routes/userRoute.js";
// import cartRouter from "./routes/cartRoute.js";
// import orderRouter from "./routes/orderRoute.js";
import categoryRouter from "./routes/categoryRoute.js";
import authRouter from "./routes/authRoute.js";
import "dotenv/config";

// app config
const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(express.json());
app.use(cors());
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// db config
connectDB();

// api endpoints
app.use("/api/product", productRouter);
// app.use("/images", express.static("uploads"));
app.use("/api/user", userRouter);
// app.use("/api/cart", cartRouter);
// app.use("/api/order", orderRouter);
app.use("/api/category", categoryRouter);
app.use("/auth", authRouter);

// api routes
app.get("/", (req, res) => {
  res.status(200).send("Hello World");
});

// listen
app.listen(port, () => {
  console.log(`Server is running on port ${port} ex: http://localhost:${port}`);
});

// mongodb+srv://covanan:cvan6323@cluster0.bdmttar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
