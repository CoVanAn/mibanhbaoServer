import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    // image: { type: String, required: true },
});

const categoryModel = mongoose.models.category || mongoose.model("Category", categorySchema);
export default categoryModel;