import foodModel from "../models/foodModel.js";
import fs from "fs";


// add a new food item
const addFood = async (req, res) => {

    
    let image_filename = `${req.file.filename}`;

    const food = new foodModel({
        name: req.body.name,
        price: req.body.price,
        description: req.body.description,
        image: image_filename,
        category: req.body.category
    });

    try{
        await food.save();
        res.json({success: 'Food added successfully'});
    } catch (error) {
        console.log(error);
        res.json({ message: "error"});
    }
}

// all food items
const listfood = async (req, res) => {
    try {
        const foods = await foodModel.find({});
        res.json(foods);
    } catch (error) {
        console.log(error);
        res.json({ message: "error"});
    }
}

// remove food item
const removeFood = async (req, res) => {
    try {
        const food = await foodModel.findById(req.body.id);
        fs.unlink(`uploads/${food.image}`, () => {});

        await foodModel.findByIdAndDelete(req.body.id);
        res.json({success: 'Food removed successfully'});
    }
    catch (error) {
        console.log(error);
        res.json({ success:false, message: "error"});
    }
}


export {addFood, listfood, removeFood}