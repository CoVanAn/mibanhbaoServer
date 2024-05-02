import express from 'express';
import { addFood, listfood, removeFood } from '../controllers/foodController.js';
import multer from 'multer';

const foodRouter = express.Router();


//Image upload

const storage = multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

foodRouter.post('/add', upload.single("image"), addFood);
foodRouter.get('/list', listfood);
foodRouter.get('/remove', removeFood);



export default foodRouter;