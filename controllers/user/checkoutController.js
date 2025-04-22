const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Cart=require("../../models/cartSchema")
const mongoose=require('mongoose')
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");

const loadCheckoutPage = async (req, res) => {
  try {
      const userId = req.session.user;
      const user=await User.findById(userId)

      const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            populate: [
              {
                path: "brand",
                model: "Brand",
              },
              {
                path: "category",
                model: "Category",
              },
            ],
          });
      
    const wallet = await Wallet.findOne({ userId: userId });
        

      const addressData = await Address.findOne({ userId: userId });

      if (!user) {
          return res.status(404).send("User not found");
      }

     
      for (let item of cart.items) {
          if (item.productId && item.quantity > item.productId.quantity) {
              item.quantity = item.productId.quantity;
              if (item.quantity === 0) {
                  cart.items = cart.items.filter(cartItem => cartItem.productId.toString() !== item.productId.toString());
              }
          }
      }
      await cart.save();
      const cartItems = cart.items
          .filter(item => 
              item.productId && 
              !item.productId.isBlocked && 
              item.productId.category && 
              item.productId.category.isListed && 
              item.productId.quantity > 0
          )
          .map((item) => ({
              product: item.productId,
              quantity: item.quantity,
              totalPrice: item.productId.salePrice * item.quantity,
          }));

      const subtotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);
      const shippingCharge = 0; // Free shipping
      const grandTotal = subtotal + shippingCharge;
      const coupons= await Coupon.find({isListed:true})
        if(cartItems.length>0){
      res.render("checkout", {
          user,
          cartItems,
          subtotal,
          shippingCharge,
          grandTotal,
          userAddress: addressData,
         wallet:wallet || { balance: 0, },
         coupons
            // refundAmount: 0, totalDebited: 0 ,
      });}else{
        res.redirect('/cart')
      }
  } catch (error) {
      console.error("Error in loadCheckoutPage:", error);
      res.redirect("/pageNotFound");
  }
};

const addAddressCheckout = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findById(user);
        res.render("add-address-checkout", {
            theUser: user,
            user: userData
        });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const postAddAddressCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login"); // Redirect if user not logged in
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.redirect("/pageNotFound"); // Handle invalid user
        }

        const { addressType, name, country, city, landMark, state, streetAddress, pincode, phone, altPhone } = req.body;

        // Check if the user already has an address document
        let userAddress = await Address.findOne({ userId });

        const newAddress = {
            addressType,
            name,
            country,
            city,
            landMark,
            state,
            streetAddress,
            pincode,
            phone,
            altphone: altPhone, // Match the schema key
        };

        if (!userAddress) {
            // If no address exists, create a new one
            userAddress = new Address({
                userId,
                address: [newAddress],
            });
        } else {
            // If address exists, push the new address
            userAddress.address.push(newAddress);
        }

        await userAddress.save();
        return res.redirect("/checkout");

    } catch (error) {
        console.error("Error adding address:", error);
        res.redirect("/pageNotFound");
    }
};

const applyCoupon = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const { couponCode, grandtotal} = req.body;
    console.log(req.body)
    const coupon = await Coupon.findOne({ name: couponCode, isListed: true });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }
    if (coupon.minimumPrice > grandtotal) {
      return res
        .status(400)
        .json({
          success: false,
          message: `You need to have items worth ${coupon.minimumPrice} to apply this coupon`,
        });
    }
    if (coupon.usedBy.includes(userId)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "You have already used this coupon.",
        });
    }
    await Cart.findOneAndUpdate(
      { userId: userId },
      { $set: { discount: coupon.offerPrice } },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Coupon applied", coupon });
  } catch (error) {
    next(error);
  }
};
  
const removeCoupon = async (req,res,next) => {
    try {
      const userId= req.session.user;
      await Cart.findOneAndUpdate({userId:userId},{$set:{discount:0}},{new:true});
      res.status(200).json({success:true,message:'Coupon applied'})
  
    } catch (error) {
      next(error)
    }
    
  }



module.exports = {
    loadCheckoutPage,
    postAddAddressCheckout,
    addAddressCheckout,
    applyCoupon,
    removeCoupon,

};