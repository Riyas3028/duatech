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
            userId:userId,
            paymentMethod:paymentMethod
        });

        await orderSchema.save();

        await User.findByIdAndUpdate(userId, { $push: { orderHistory: orderSchema._id } }, { new: true });

        await Cart.findOneAndUpdate({userId},{$set:{items:[]}})

        const orderedItems = cart.items.map(item => ({
            product: item.productId, 
            quantity: item.quantity,
 
        }));
        for(let i=0;i<orderedItems.length;i++){
            await Product.findByIdAndUpdate(orderedItems[i].product,{$inc:{quantity:-orderedItems[i].quantity}});
        }



        return res.status(200).json({success:true,message:'Order Placed Successfully'})
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

        
        const userId = req.session.user;
       const user = await User.findById(userId);

       const orders = await Order.find({userId:userId}).populate('orderedItems.product');
       


       res.render('view-orders',{order:{},user:user,orders:orders});
   } catch (error) {
       console.error(error);
       res.redirect('/pageNotFound')
   }
}


const loadOrderDetails = async (req, res) => {
    try {

        const userId = req.session.user;
        const user = await User.findById(userId);
        const orderId=req.query.orderId;

        let orders = await Order.findOne({orderId:orderId}).populate('orderedItems.product').lean();
        
        const addressDoc = await Address.findOne({ userId:userId }).lean();


        const userAddress = addressDoc.address.find(addr => addr._id.toString() === orders.address.toString());
        

        orders.address= userAddress;
        console.log(orders)



        res.render("order-details", {
            order:orders,
            user:user,
          })
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
  }

const cancelOrder=async(req,res)=>{
    try {
        const user= req.session.user;
        const { orderId, reason } = req.body;
        console.log(orderId, reason);
    
       const order= await Order.findById(orderId)
    
            await Order.findOneAndUpdate(
          { _id: orderId },
          {$set: {status: "cancelled",cancelReason: reason,},},{ new: true });
    
    
        const orderedItems = order.orderedItems.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          }));
    
    
          console.log(orderedItems);
          for (let i = 0; i < orderedItems.length; i++) {
            await Product.findByIdAndUpdate(orderedItems[i].product, {
              $inc: { quantity: orderedItems[i].quantity },
            });
          }
    
    
        return res
          .status(200)
          .json({ success: true, message: "Order cancelled successfully" });
      } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
      }
}
const downloadInvoice=async(req,res)=>{
    try {
        const userId = req.session.user;
        const user = await User.findById(userId)
        const orderId=req.query.orderId;
        
        let order = await Order.findOne({orderId:orderId}).populate('orderedItems.product').lean();
        
        const addressDoc = await Address.findOne({ userId: userId }).lean();
        
        const userAddress = addressDoc.address.find((addr) => addr._id.toString() === order.address.toString());
        console.log(userAddress)
        order.address = userAddress

        console.log(order);
    

        res.render('invoice',{order:order,user:user});

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound')
    }
}


module.exports={
    loadConfirmation,
    placeOrder,
    viewOrders,
    loadOrderDetails,
    cancelOrder,
    downloadInvoice,
}