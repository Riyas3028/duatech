const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const bannerController= require("../controllers/admin/bannerController");
const orderController=require("../controllers/admin/orderController");
const couponController=require("../controllers/admin/couponController")
const salesController=require("../controllers/admin/salesController")
const walletController=require("../controllers/admin/walletController")
const multer=require('multer')
const { adminAuth } = require("../middlewares/auth");

const storage=require("../helpers/multer")
const uploads=multer({storage:storage});
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");

// Admin Login Routes
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);

// Protected Admin Routes (Require Authentication)
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.post("/logout", adminAuth, adminController.logout);

// Error Page Route
router.get("/admin-error", adminController.pageError);

// Customer Management
router.get("/customers", adminAuth, customerController.customerInfo);
router.post("/customers/block/:id", adminAuth, customerController.blockCustomer);
router.post("/customers/unblock/:id", adminAuth, customerController.unblockCustomer);

// Category Management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);

// Brands Management
router.get("/brands", adminAuth, brandController.getBrandPage);
router.post("/addBrand", adminAuth, uploads.single("images"), brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);
router.get('/editBrand', adminAuth, brandController.geteditBrand)
router.post('/editBrand/:id',adminAuth,uploads.single('images'),brandController.editBrand)

// Product Management
router.get("/add-products", adminAuth, productController.getProductAddPage);
router.post("/add-products", adminAuth, uploads.array("images",4), productController.addProducts);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProductOffer", adminAuth, productController.addProductOffer);
router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/edit-Products", adminAuth, productController.getEditProduct);
router.post("/edit-Products/:id",adminAuth,uploads.array("images",4),productController.editProducts)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)

// banner management
router.get("/banners",adminAuth,bannerController.getBannerPage)
router.get('/addBanner',adminAuth,bannerController.getAddBannerPage)
router.post("/addBanner",adminAuth,uploads.single("images"),bannerController.addBanner)
router.get('/deleteBanner',adminAuth,bannerController.deleteBanner)

// order management
router.get('/orders',adminAuth,orderController.loadOrderDetails)
router.get('/adminOrders/:id',orderController.viewOrderDetails);
router.put('/updateStatus',orderController.updateStatus);
router.put('/orderCancel',orderController.orderCancel)
router.put('/handleReturn',orderController.handleReturn)
router.put('/updateReturnStatus',orderController.updateReturnStatus)

//Coupon Management
router.get('/coupon',adminAuth,couponController.loadCoupon);
router.post ('/coupon',adminAuth,couponController.addCoupon);
router.put('/coupon',adminAuth,couponController.editCoupon);
router.delete('/coupon',adminAuth,couponController.deleteCoupon);

// Inventory management
router.get('/inventory',adminAuth,productController.loadInventory);
router.patch('/inventory',adminAuth,productController.updateInventory)

router.get('/sales',adminAuth,salesController.loadSales);
router.get('/salesReport',adminAuth,salesController.loadSalesReport);


router.get('/wallet',adminAuth,walletController.loadWallet)
module.exports = router;
