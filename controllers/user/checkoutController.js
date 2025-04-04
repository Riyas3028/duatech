const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Cart=require("../../models/cartSchema")
const mongoose=require('mongoose')
// const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");

const loadCheckoutPage = async (req, res) => {
  try {
      const userId = req.session.user;
      const user=await User.findById(userId)

    //   const user = await User.findById(userId).populate({
    //       path: "cart.productId",
    //       model: "Product",
    //       populate: {
    //           path: "category",
    //           model: "Category",
    //       },
    //   });

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
        
    //   let transactions = [];
    //   if (wallet) {
    //       transactions = wallet.transactions.sort((a, b) => b.createdAt - a.createdAt);
    //   }

      const addressData = await Address.findOne({ userId: userId });

      if (!user) {
          return res.status(404).send("User not found");
      }

      // Adjust cart quantities based on current product stock
      for (let item of cart.items) {
          if (item.productId && item.quantity > item.productId.quantity) {
              item.quantity = item.productId.quantity;
              if (item.quantity === 0) {
                  cart.items = cart.items.filter(cartItem => cartItem.productId.toString() !== item.productId.toString());
              }
          }
      }
      await cart.save();

      // Filter out blocked products, unlisted categories, and products with quantity <= 0
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
        if(cartItems.length>0){
      res.render("checkout", {
          user,
          cartItems,
          subtotal,
          shippingCharge,
          grandTotal,
          userAddress: addressData,
         wallet:wallet || { balance: 0, }
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

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, subtotal } = req.body;
        const userId = req.session.user;

        const coupon = await Coupon.findOne({ name: couponCode, isList: true });

        if (!coupon) {
            return res.json({ success: false, message: 'Invalid coupon code' });
        }

        if (new Date() > coupon.expireOn) {
            return res.json({ success: false, message: 'Coupon has expired' });
        }

        if (subtotal < coupon.minimumPrice) {
            return res.json({ success: false, message: `Minimum purchase amount should be ₹${coupon.minimumPrice}` });
        }

        if (coupon.userId.includes(userId)) {
            return res.json({ success: false, message: 'You have already used this coupon' });
        }

        res.json({ success: true, coupon: coupon });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'An error occurred while applying the coupon' });
    }
};


const checkStock = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId).populate({
            path: "cart.productId",
            model: "Product"
        });

        if (!user || !user.cart.length) {
            return res.json({
                success: false,
                message: "Cart is empty"
            });
        }

        const stockChanges = user.cart.map(item => {
            const product = item.productId;
            const requestedQty = item.quantity;
            const availableQty = product.quantity;
            
            return {
                productId: product._id,
                stockChanged: requestedQty > availableQty,
                availableQty: availableQty,
                requestedQty: requestedQty
            };
        });

        // Update cart quantities if needed
        for (const item of stockChanges) {
            if (item.stockChanged) {
                await User.updateOne(
                    { 
                        _id: userId,
                        "cart.productId": item.productId 
                    },
                    {
                        $set: {
                            "cart.$.quantity": item.availableQty
                        }
                    }
                );
            }
        }

        res.json({
            success: true,
            items: stockChanges
        });
    } catch (error) {
        console.error("Error checking stock:", error);
        res.status(500).json({
            success: false,
            message: "Error checking stock availability"
        });
    }
};

module.exports = {
    loadCheckoutPage,
    postAddAddressCheckout,
    addAddressCheckout,
    applyCoupon,
    checkStock,

};