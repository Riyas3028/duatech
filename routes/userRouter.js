const express=require('express')
const router=express.Router()
const userController=require("../controllers/user/userController")
const passport = require('passport')
const profileController=require('../controllers/user/profileController')
const productController = require("../controllers/user/productController")
const cartController=require('../controllers/user/cartController')
const wishlistController=require('../controllers/user/wishlistController')
const checkoutController=require('../controllers/user/checkoutController')
const orderController=require('../controllers/user/orderController')
const walletController=require('../controllers/user/walletController')
const { userAuth } = require("../middlewares/auth");

const multer=require('multer')
const storage=require("../helpers/multer")
const uploads=multer({storage:storage});


router.get("/",userController.loadHomepage)
router.get("/signup",userController.loadsignup)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),userController.googleSession)
router.get('/login',userController.loadLogin)
router.get('/pageNotFound',userController.pageNotFound)
router.post('/login',userController.login)
router.get("/logout",userController.logout)

router.get("/shop",userController.loadShoppingPage);
router.get("/filter",userController.filterProduct);

// profilemanagement
router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.post("/resendotp",profileController.resendOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/reset-password",profileController.postNewPassword)
router.get('/userProfile',userAuth,profileController.userProfile)
router.get('/changeEmail',userAuth,profileController.changeEmail)
//router.get('/changePassword',userAuth,profileController.changePassword)


router.get("/productDetails",productController.productDetails);


//Address Management
router.get("/address",userAuth,profileController.loadAddressPage)
router.get("/addAddress",userAuth,profileController.addAddress)
router.post("/addAddress",userAuth,profileController.postAddAddress)
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)


router.post('/cart/:productId',userAuth,cartController.addToCart)
router.get('/cart',userAuth,cartController.loadCart)
router.put('/cart',userAuth,cartController.changeQuantity)
router.delete('/cart',userAuth,cartController.removeCart)

router.get("/wishlist",userAuth,wishlistController.loadWishlist)
router.post("/wishlist",userAuth,wishlistController.addToWishlist)
router.get("/removeFromWishList",userAuth,wishlistController.removeProduct)

router.get("/address",userAuth,profileController.loadAddressPage)
router.get("/addAddress",userAuth,profileController.addAddress)
router.post("/addAddress",userAuth,profileController.postAddAddress)
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)



// Profile Management
router.post("/update-profile",userAuth,profileController.updateProfile)
router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp)
router.post("/update-email",userAuth,profileController.updateEmail)
router.post('/uploadProfile',userAuth,uploads.single('profileImage'),profileController.uploadProfile);

router.post("/change-password", userAuth, profileController.changePassword)

// router.get("/forgot-password-logout",forgotPassLogout,profileController.getForgotPassPage)

router.get('/checkout',userAuth,checkoutController.loadCheckoutPage)
router.get("/addAddressCheckout",userAuth,checkoutController.addAddressCheckout)
router.post("/addAddressCheckout",userAuth,checkoutController.postAddAddressCheckout)

router.post('/placeOrder',userAuth,orderController.placeOrder)
router.get('/confirmation',userAuth,orderController.loadConfirmation)
router.get('/orders',userAuth,orderController.viewOrders)
router.get("/orderDetails", userAuth, orderController.loadOrderDetails);
router.put('/cancelOrder',userAuth,orderController.cancelOrder)
router.get('/downloadInvoice',userAuth,orderController.downloadInvoice)
router.post("/returnOrder", userAuth, uploads.array('images', 3), orderController.requestReturn);
router.post("/ordersearch", userAuth, orderController.orderSearch);
router.put('/cancelReturnRequest',userAuth,orderController.cancelReturnRequest)

// wallet
router.get('/wallet',userAuth,walletController.loadWallet)
router.post("/wallet/create-order", walletController.createOrder);
router.post("/wallet/verify-payment", walletController.verifyPayment);
router.put("/wallet/withdrawMoney",userAuth,walletController.withdrawMoney);
router.post('/placeWalletOrder',userAuth,orderController.placeWalletOrder)

router.post("/order/createOrder",userAuth,orderController.createOrder)
router.post("/order/verifyPayment",userAuth,orderController.verifyPayment);
module.exports=router