const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Cart = require("../../models/cartSchema"); 
const Address = require("../../models/addressSchema");
const Order = require('../../models/orderSchema');


const placeOrder =async (req,res) => {
    try {
        console.log('--------------------------------------');
       const  userId = req.session.user;
       const {addressId,paymentMethod} = req.body;


       const userData = await User.findById(userId);
        
       const cart = await Cart.findOne({ userId });


        const cartItems = cart.items.map(item => ({
            product: item.productId, 
            quantity: item.quantity,
            price: item.totalPrice  
        }));
        console.log(cartItems)

        const totalPrice=cartItems.reduce((sum,item)=>sum+item.price,0);
        console.log(totalPrice)

        const finalAmount=totalPrice+50;

        const invoiceDate = new Date();
        const status = 'Processing';

        const orderSchema= new Order({
            orderedItems:cartItems,
            totalPrice:totalPrice,
            finalAmount:finalAmount,
            address:addressId,
            invoiceDate:invoiceDate,
            status:status,
        });

        await orderSchema.save();

        await User.findByIdAndUpdate(userId, { $push: { orderHistory: orderSchema._id } }, { new: true });



        return res.status(200).json({success:true,message:'hgvjhgv'})
    } catch (error) {
        
    }
    
}


const loadConfirmation = async (req,res) => {
    try {

        const userId = req.session.user;

        const orderData = await User.findById(userId,{orderHistory:1}).populate('orderHistory');

        const data= orderData.orderHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(data)

        const orderId = data[0].orderId
        res.render('orderConfirmation',{orderId:orderId})
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}

const viewOrders=async(req,res)=>{
    try {
        res.render('view-orders',{order:{},user:{},orders:{}})
    } catch (error) {
        
    }
}



module.exports={
    loadConfirmation,
    placeOrder,
    viewOrders
}