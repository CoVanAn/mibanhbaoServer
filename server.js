import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import foodRouter from './routes/foodRoute.js';
import userRouter from './routes/userRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import categoryRouter from './routes/categoryRoute.js';
import 'dotenv/config'


// app config
const app = express();
const port = process.env.PORT || 4001;

// middleware
app.use(express.json());
app.use(cors());

// db config
connectDB();

// api endpoints
app.use('/api/food', foodRouter);
app.use('/images', express.static('uploads'));
app.use('/api/user', userRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/category',categoryRouter);

// api routes
app.get('/', (req, res) => {
    res.status(200).send('Hello World');
});

// listen
app.listen(port, () => {
    console.log(`Server is running on port ${port} ex: http://localhost:${port}`);
});

// mongodb+srv://covanan:cvan6323@cluster0.bdmttar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0