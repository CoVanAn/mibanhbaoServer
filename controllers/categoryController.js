import categoryModel from "../models/categoryModel.js";
import bcrypt from "bcrypt";
import validator from "validator";

//category user
const addCategory = async (req, res) => {

    // let image_filename = `${req.file.filename}`;

    const { name } = req.body;
    try {
        // const category = await categoryModel.findOne({ name });
        const newCategory = new categoryModel({
            name: name,
            // image: image_filename
        });
        await newCategory.save();
        res.json({ success: true, message: "Category added successfully" });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

//all categories
const listCategory = async (req, res) => {
    try {
        const categories = await categoryModel.find({});
        res.json(categories);
    } catch (error) {
        console.log(error);
        res.json({ message: "error" });
    }
}

const removeCategory = async (req, res) => {

    try {
        await category.findByIdAndDelete(req.body.id);
        res.json({ success: 'Category removed successfully' });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: "error" });
    }
}

export { addCategory, listCategory }

