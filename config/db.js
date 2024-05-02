import mongoose from "mongoose";

export const connectDB = async () => {
    await mongoose.connect('mongodb+srv://covanan:cvan6323@cluster0.bdmttar.mongodb.net/food-del').then(() => console.log('MongoDB connected!')); 
}


