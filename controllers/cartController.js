import useModel from '../models/userModel.js';

//add items to user cart
const addToCart = async (req, res) => {
    try {
        let userData = await useModel.findOne({ _id: req.body.userId });
        // if (!userData) return res.json({ success: false, error: 'User not found' });
        let cartData = await userData.cartData;
        if (!cartData[req.body.itemId]) cartData[req.body.itemId] = 1;
        else cartData[req.body.itemId] += 1;

        await useModel.findByIdAndUpdate(req.body.userId, { cartData });
        res.json({ success: true, message: 'Item added to cart' });

    } catch (error) {
        console.log(error);
        // res.json({ success: false, error: 'Something went wrong' });
    }
}

//remove items from user cart
const removeFromCart = async (req, res) => {
    try {
        let userData = await useModel.findById(req.body.userId);
        let cartData = await userData.cartData;
        if (!cartData[req.body.itemId]) return res.json({ success: false, error: 'Item not found in cart' });
        if (cartData[req.body.itemId] > 0) cartData[req.body.itemId] -= 1;
        await useModel.findByIdAndUpdate(req.body.userId, { cartData });
        res.json({ success: true, message: 'Item removed from cart' });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, error: 'Something went wrong' });
    }
}

//fetch user cart data
const getCart = async (req, res) => {
    try {
        let userData = await useModel.findById(req.body.userId);
        let cartData = await userData.cartData;
        res.json({ success: true, cartData });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, error: 'Something went wrong' });
    }
}

export {
    addToCart,
    removeFromCart,
    getCart
}