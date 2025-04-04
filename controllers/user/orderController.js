const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Cart = require("../../models/cartSchema"); 
const Address = require("../../models/addressSchema");
const Order = require('../../models/orderSchema');
const Wallet=require('../../models/walletSchema')
const razorpay=require('../../config/razorpay')
const crypto=require('crypto')



const placeOrder =async (req,res) => {
    try {
        
       const  userId = req.session.user;
       const {addressId,paymentMethod} = req.body;


       const userData = await User.findById(userId);
        
       const cart = await Cart.findOne({ userId });


        const cartItems = cart.items.map(item => ({
            product: item.productId, 
            quantity: item.quantity,
            price: item.totalPrice  
        }));
        

        const totalPrice=cartItems.reduce((sum,item)=>sum+item.price,0);
        

        let finalAmount=0;
    if(totalPrice<50000){
    finalAmount = totalPrice + 200;
    }else{
      finalAmount = totalPrice 
    }
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

       const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;


       const orders = await Order.find({userId:userId}).populate('orderedItems.product').sort({createdAt:-1}).skip(skip).limit(limit);

       
       const totalOrders = await Order.countDocuments({userId:userId});
       const totalPages = Math.ceil(totalOrders/limit);


       res.render('view-orders',{order:{},user:user,orders:orders,currentPage:page,
        totalPages:totalPages,});
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
        
    
       const order= await Order.findById(orderId)
       
       if(order.paymentMethod!='cod'){
         let wallet = await Wallet.findOne({ userId: user });
   
         if (!wallet) {
           return res
             .status(400)
             .json({ success: false, message: "Wallet not Found" });
         }
   
         wallet.balance += parseInt(order.finalAmount);
       wallet.transactions.push({
         amount:order.finalAmount,
         type: "credit",
         description: "Order cancellation Refund",
       });
       await wallet.save();
   
       }
            await Order.findOneAndUpdate(
          { _id: orderId },
          {$set: {status: "cancelled",cancelReason: reason,},},{ new: true });
    
    
        const orderedItems = order.orderedItems.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          }));
    
    
          
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
// const downloadInvoice=async(req,res)=>{
//     try {
//         const userId = req.session.user;
//         const user = await User.findById(userId)
//         const orderId=req.query.orderId;
        
//         let order = await Order.findOne({orderId:orderId}).populate('orderedItems.product').lean();
        
//         const addressDoc = await Address.findOne({ userId: userId }).lean();
        
//         const userAddress = addressDoc.address.find((addr) => addr._id.toString() === order.address.toString());
        
//         order.address = userAddress

        
    

//         res.render('invoice',{order:order,user:user});

//     } catch (error) {
//         console.error(error);
//         res.redirect('/pageNotFound')
//     }
// }

const puppeteer = require('puppeteer');
const path = require('path');

const downloadInvoice = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const orderId = req.query.orderId;

        let order = await Order.findOne({ orderId }).populate('orderedItems.product').lean();
        if (!order) {
            return res.status(404).send("Order not found");
        }

        const addressDoc = await Address.findOne({ userId }).lean();
        if (!addressDoc || !addressDoc.address) {
            return res.status(404).send("Address not found");
        }

        const userAddress = addressDoc.address.find((addr) => addr._id.toString() === order.address.toString());
        if (!userAddress) {
            return res.status(404).send("Shipping address not found");
        }

        order.address = userAddress;
        
        // Process the order data to ensure all properties needed by template exist
        order.deliveredAt = order.deliveredAt || order.deliveredOn || order.createdAt;
        order.finalAmount = order.finalAmount || 0;
        order.totalPrice = order.totalPrice || 0;
        order.discount = order.discount || 0;
        
        // Process each ordered item
        order.orderedItems = order.orderedItems.map(item => {
            return {
                ...item,
                price: item.price || (item.product ? item.product.salePrice : 0),
                quantity: item.quantity || 1,
                product: {
                    ...item.product,
                    // Ensure product image is available
                    productImage: item.product && item.product.productImage && item.product.productImage.length > 0 
                        ? item.product.productImage 
                        : ['placeholder.jpg']
                }
            };
        });

        // Get server base URL for absolute image paths
        const serverBaseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Render invoice as HTML
        const htmlContent = await new Promise((resolve, reject) => {
            res.render('invoice', { 
                order, 
                user,
                serverBaseUrl,
                formatNumber: (num) => (typeof num === 'number' ? num.toFixed(2) : '0.00')
            }, (err, html) => {
                if (err) reject(err);
                else resolve(html);
            });
        });

        // Launch Puppeteer
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Handle console logs from the page for debugging
        page.on('console', msg => console.log('PDF Page Log:', msg.text()));
        
        // Add error tracking
        page.on('error', err => {
            console.error('Puppeteer error:', err);
        });
        
        page.on('pageerror', err => {
            console.error('Page error:', err);
        });

        // Set content with longer timeout
        await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Use evaluate for a delay instead of waitForTimeout
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();

        // Set appropriate headers
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename=invoice_${orderId}.pdf`
        });
        
        res.send(pdfBuffer);

    } catch (error) {
        console.error("PDF Download Error:", error);
        // Send specific error message
        res.status(500).send(`Error generating PDF: ${error.message}`);
    }
};
const requestReturn=async(req,res)=>{
    try {
        const userId = req.session.user;
        const { orderId, returnReason, returnDescription } = req.body;
        const images = req.files.map((items) => items.filename);
    
        const user = await User.findById(userId);
    
        if (user.orderHistory.includes(orderId)) {
          await Order.findByIdAndUpdate(orderId, {
            $set: {
              status: "Return Requested",
              returnReason: returnReason,
              returnDescription: returnDescription,
              returnImage: images,
              requestStatus:'pending'
            },
          });
        } else {
          return res
            .status(400)
            .json({ success: false, message: "Order not Found" });
        }
    
        return res.status(200).json({ success: true, message: "returned" });
      } catch (error) {
        console.error(error);
        res.render("/pageNotFound");
      }
}

const orderSearch=async(req,res)=>{
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const search= req.body.query;
        
    
        const orders = await Order.find({ orderId: search }).populate(
          "orderedItems.product"
        );
        if(orders){
         return res.render("view-orders", { order: {}, user: user, orders: orders,currentPage:0,totalPages:0 });
        }else{
          return res.render("view-orders", { order: {}, user: {}, orders: {} });
        }
        
      } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
      }
}

const cancelReturnRequest=async(req,res)=>{
  try {
    const userId = req.session.user;
    const { orderId} = req.body;
    // const images = req.files.map((items) => items.filename);

    const user = await User.findById(userId);

    if (user.orderHistory.includes(orderId)) {
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          status:'delivered',
          returnReason:'',
          returnDescription:'',
          returnImage: [],
          requestStatus:''
        },
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Order not Found" });
    }

    return res.status(200).json({ success: true, message: "return request cancelled" });
  } catch (error) {
    console.error(error);
    res.render("/pageNotFound");
  }
}
const placeWalletOrder = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethod } = req.body;

    const userData = await User.findById(userId);

    const cart = await Cart.findOne({ userId });

    const cartItems = cart.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.totalPrice,
    }));

    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

    let finalAmount
    if(totalPrice<50000){
    finalAmount = totalPrice + 200;
    }else{
      finalAmount = totalPrice 
    }

    const invoiceDate = new Date();
    const status = "Processing";

    let wallet = await Wallet.findOne({ userId: userId });

    if (wallet.balance < finalAmount) {
      return res
        .status(400)
        .json({
          success: false,
          message:`you only have ₹ ${wallet.balance} in your wallet!`,
        });
    }

    if (!wallet) {
      return res
        .status(400)
        .json({ success: false, message: "Wallet not Found" });
    }

    wallet.balance -= parseInt(finalAmount);
    wallet.transactions.push({
      amount:finalAmount,
      type: "debit",
      description: "Deducted for purchase",
    });
    await wallet.save();

    const orderSchema = new Order({
      userId: userId,
      orderedItems: cartItems,
      totalPrice: totalPrice,
      finalAmount: finalAmount,
      address: addressId,
      invoiceDate: invoiceDate,
      status: status,
      paymentMethod: paymentMethod,
    });
    await orderSchema.save();

    await User.findByIdAndUpdate(
      userId,
      { $push: { orders: orderSchema._id } },
      { new: true }
    );

    const orderedItems = cart.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    }));
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product, {
        $inc: { quantity: -orderedItems[i].quantity },
      });
    }

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    return res
      .status(200)
      .json({ success: true, message: "Order placed successfully" });

  } catch (error) {
    next(error);
  }
};
const createOrder = async (req, res, next) => {
  try {
    const userId = req.session.user;
    

    const userData = await User.findById(userId);
    const cart = await Cart.findOne({ userId });

    const cartItems = cart.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.totalPrice,
    }));

    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
    let finalAmount = totalPrice < 15000 ? totalPrice + 500 : totalPrice;

    const options = {
      amount: finalAmount * 100, 
      currency: "INR",
      receipt: `txn_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    
    res.status(200).json({
      id: order.id, 
      amount: options.amount, 
      currency: options.currency,
    });
  } catch (error) {
    next(error);
  }
};


const verifyPayment = async (req, res, next) => {
  try {
   
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const { addressId, paymentMethod } = req.body;
    console.log(addressId,paymentMethod);
    const userId = req.session.user;
     
    
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    const userData = await User.findById(userId);

    const cart = await Cart.findOne({ userId });

    const cartItems = cart.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.totalPrice,
    }));

    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
    let finalAmount=0;
    if(totalPrice<50000){
    finalAmount = totalPrice + 200;
    }else{
      finalAmount = totalPrice 
    }

    

    const invoiceDate = new Date();
    const status = "Processing";

    const orderSchema = new Order({
      userId: userId,
      orderedItems: cartItems,
      totalPrice: totalPrice,
      finalAmount: finalAmount,
      address: addressId,
      invoiceDate: invoiceDate,
      status: status,
      paymentMethod: paymentMethod,
    });
    await orderSchema.save();

    await User.findByIdAndUpdate(
      userId,
      { $push: { orders: orderSchema._id } },
      { new: true }
    );

    const orderedItems = cart.items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    }));
    for (let i = 0; i < orderedItems.length; i++) {
      await Product.findByIdAndUpdate(orderedItems[i].product, {
        $inc: { quantity: -orderedItems[i].quantity },
      });
    }

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });


    res.status(200).json({ success: true, message: "Payment successful" });
  } catch (error) {
    next(error);
  }
};
module.exports={
    loadConfirmation,
    placeOrder,
    viewOrders,
    loadOrderDetails,
    cancelOrder,
    downloadInvoice,
    requestReturn,
    orderSearch,
    cancelReturnRequest,
    placeWalletOrder,
    createOrder,
    verifyPayment

}