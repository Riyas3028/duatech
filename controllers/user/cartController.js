const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;

    const { quantity } = req.body;
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let cart = await Cart.findOne({ userId });

    if (cart) {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (itemIndex > -1) {
        if(cart.items[itemIndex].quantity+quantity>=5){
          return res.status(400).json({success:false,message:"You have reached maximum product in your cart"})
        }
        else if(cart.items[itemIndex].quantity+quantity>product.quantity){
          return res.status(400).json({success:false,message:`${cart.items[itemIndex].quantity} item already in cart , we have only ${product.quantity} in Stock`})
        }else{
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].totalPrice =
        cart.items[itemIndex].quantity * cart.items[itemIndex].price;
        }
      } else {
        cart.items.push({
          productId,
          quantity,
          price: product.salePrice,
          totalPrice: quantity * product.salePrice,
        });
      }
    } else {
      cart = new Cart({ 
        userId,
        items: [
          {
            productId,
            quantity,
            price: product.salePrice,
            totalPrice: quantity * product.salePrice,
          },
        ],
      });
    }

    await cart.save();

    const userCart = await User.findOne({ _id: userId }, { cart: 1 });

    if (!userCart || userCart.cart.length === 0) {
      // Check if cart array is empty
      await User.findByIdAndUpdate(
        userId,
        { $set: { cart: [cart._id] } },
        { new: true }
      );
    }
    res
      .status(200)
      .json({ success: true, message: "Product added to cart", cart });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user; // Get logged-in user ID
    const userData = await User.findById(userId);
    // Fetch the cart for the user & populate product details
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

    

    if (!cart || cart.items.length === 0) {
      return res.render("cart", {
        data: [],
        grandTotal: 0,
        user: req.session.user,
      });
    }

    // Format cart data for EJS rendering
    const cartData = cart.items.filter(item=>item.productId&&item.productId.isBlocked===false)
    .map((item) => ({
      productDetails: item.productId, // Correct access
      quantity: item.quantity,
    }));


    
    let grandTotal = cart.items.filter(item=>item.productId&&item.productId.isBlocked===false)
    .reduce((acc, item) => {
      return acc + (item.productId?.salePrice || 0) * item.quantity; // Prevent undefined error
    }, 0);

    // console.log(cartData[0].productDetails.brandId)
    res.render("cart", { data: cartData, grandTotal, user: req.session.user });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).send("Server Error");
  }
};


const changeQuantity = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, count } = req.body;

        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            populate: [
                { path: "brand", model: "Brand" },
                { path: "category", model: "Category" }
            ]
            
        });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Find the specific item in the cart
        const specificItem = cart.items.find(item =>
            item.productId && item.productId._id.toString() === productId.toString()
        );

        if (!specificItem) {
            return res.status(404).json({ message: "Product not found in cart" });
        }

        // Update the quantity
        specificItem.quantity += count;

        // Ensure the quantity is at least 1
        if (specificItem.quantity < 1) {
            specificItem.quantity = 1;
        }

        // Save the updated cart
        await cart.save();

        // Prepare data for rendering
        const cartData = cart.items.map(item => ({
            productDetails: item.productId,
            quantity: item.quantity
        }));

        let grandTotal = cart.items.reduce((acc, item) => {
            return acc + ((item.productId?.salePrice || 0) * item.quantity);
        }, 0);

        // Send a JSON response or render the cart page
        res.status(200).json({
            success: true,
            message: "Updated successfully",
            cartData,
            grandTotal
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const removeCart = async(req,res,next)=>{
  try {
      const productId = req.query.productId;
      console.log("TestProductId",productId);

      const userId = req.session.user;
      const user = await User.findById(userId);

      const cart = await Cart.findOne({ userId }).populate({
          path: "items.productId",
          populate: [
              { path: "brand", model: "Brand" },
              { path: "category", model: "Category" }
          ]
      });


       // Find the specific item in the cart
      
       await Cart.updateOne(
          { userId },
          { $pull: {items: { productId: productId } } }
      );

      
       console.log("product removed successfully from cart");
      return res.status(200).json({success:true, message: "Product removed successfully!" });
  } catch (error) {
      console.error("Error deleting product from cart", error);
      next(error);
  }
}

module.exports = {
  addToCart,
  loadCart,
  changeQuantity,
  removeCart
};
