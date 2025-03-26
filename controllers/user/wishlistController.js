const User = require("../../models/userSchema")
const Wishlist = require("../../models/wishlistSchema")
const Product = require("../../models/productSchema")
const Cart=require("../../models/cartSchema")


const loadWishlist = async (req,res) => {
    try {
        
        const userId = req.session.user;
        const user = await User.findById(userId);


        const cart = await Cart.findOne({ userId })
    
    const  cartProductIds = cart.items.map(item=>item.productId);

    const products = await Product.find({ _id: { $in: user.wishlist, $nin: cartProductIds },isBlocked:false})
    .populate('category')
    .populate('brand');
        res.render("wishlist",{
            user,
            wishlist:products,

        })

        

    } catch (error) {

        console.error('Error:',error)
        res.redirect("/pageNotFound")
        
    }
}

// const addToWishlist = async (req, res) => {
//     try {
        

//         const productId = req.body.productId;
//         const userId = req.session.user;

//         if (!productId || !userId) {
//             return res.status(400).json({ status: false, message: "Invalid request data" });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ status: false, message: "User not found" });
//         }

//         // Ensure wishlist is an array before modifying
//         if (!Array.isArray(user.wishlist)) {
//             user.wishlist = [];
//         }

//         if (user.wishlist.includes(productId)) {
//             return res.status(200).json({ status: false, message: "Product Already in Wishlist" });
//         }

//         user.wishlist.push(productId);
//         await user.save();

//         return res.status(200).json({ status: true, message: "Product Added to Wishlist" });

//     } catch (error) {
//         console.error("Error in addToWishlist:", error);
//         return res.status(500).json({ status: false, message: "Server error" });
//     }
// };

const addToWishlist = async(req,res)=>{

    console.log('heeeeee')
    try {
        const productId = req.body.productId;


        const userId = req.session.user;
        const user= await User.findById(userId)
       
        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            populate: [
                { path: "brand", model: "Brand" },
                { path: "category", model: "Category" }
            ]
        });
        console.log(cart)
        const specificItem = cart.items.find(item =>
            item.productId && item.productId._id.toString() === productId.toString()
        );
        console.log("test sp",specificItem)

        if(specificItem){
            console.log('hi')
            return res.status(200).json({status:false,message:"Product already in cart!"});
            
        }else if(user.wishlist.includes(productId)){
            return res.status(200).json({status:false,message:"Product already in wishlist!"});
        } 

        user.wishlist.push(productId);
        await user.save();

        return res.status(200).json({status:true,message:'Product added to wishlist'});
    } catch (error) {
        console.log("Error adding products to wishlist",error);
        res.redirect('/pageNotFound')
    }
}
const removeProduct = async (req,res) => {
    try {

        const productId = req.query.productId;
        const userId = req.session.user;
        const user = await User.findById(userId);
        const index = user.wishlist.indexOf(productId);
        user.wishlist.splice(index,1);

        await user.save();

        return res.redirect("/wishlist")
        
    } catch (error) {

        console.error(error);
        return res.status(500).json({status:false,message:"Server Error"})
        
    }
}






module.exports = {
    loadWishlist,
    addToWishlist,
    removeProduct,



}