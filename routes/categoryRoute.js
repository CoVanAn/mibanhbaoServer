import express from 'express';
import  { addCategory, listCategory } from '../controllers/categoryController.js';

const categoryRouter = express.Router();

categoryRouter.post('/add', addCategory);
categoryRouter.get('/list', listCategory);
// categoryRouter.post('/remove', removeCategory);

export default categoryRouter;