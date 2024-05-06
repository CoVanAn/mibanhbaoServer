import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// Cplacing user order for frontend
const placeOrder = async (req, res) => {

    const frontend_url = "http://localhost:5174"

    try {
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
        });

        await newOrder.save();
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        const line_items = req.body.items.map((item) => {
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name
                    },
                    unit_amount: item.price * 100,
                },
                quantity: item.quantity,
            }
        });
        line_items.push({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Delivery Charges'
                },
                unit_amount: 500,
            },
            quantity: 1,
        });
        res.json({success:true, session_url: session.url, message: "Order Placed Successfully" });
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message });
    }
};

//user order for frontend
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId });
        res.json({success: true, data: orders});
    } catch (error) {
        console.log(error);
        res.json({success:false, message: "error.message"});
    }
};

//Listing all orders for admin
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({success: true, data: orders});
    } catch (error) {
        console.log(error);
        res.json({success:false, message: "error.message"});
    }
}


//api for updating order status
const updateOrderStatus = async (req, res) => {
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status });
        res.json({success: true, message: "Order Status Updated Successfully"});
    }
    catch (error) {
        console.log(error);
        res.json({success:false, message: "error.message"});
    }
}

export {placeOrder, userOrders, listOrders, updateOrderStatus}