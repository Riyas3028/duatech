const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const Order = require('../../models/orderSchema')
const Category = require('../../models/categorySchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

// Load Login Page
const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard')
    }
    res.render("admin-login", { error: null })
}

// Admin Login Logic
const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const admin = await User.findOne({ email, isAdmin: true })

        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            return res.render("admin-login", { error: "Invalid email or password" })
        }

        req.session.admin = admin._id 
        return res.redirect("/admin/dashboard")
        
    } catch (error) {
        console.error("Login Error:", error)
        return res.render("admin-login", { error: "Something went wrong. Try again!" })
    }
}

// Load Dashboard
// const loadDashboard = async (req, res) => {
//     if (!req.session.admin) {
//         return res.redirect('/admin/login');
//     }
//     try {
//         res.render('dashboard');
//     } catch (error) {
//         console.error("Dashboard Error:", error);
//         res.redirect('/admin/pageError');
//     }
// };
const getTopBrands = async (matchStage) => {
    const brandStats = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$orderedItems.product.brand",
          totalQuantity: { $sum: "$orderedItems.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);
  
    const populatedBrands = await Promise.all(
      brandStats.map(async (brand) => {
        const brandDoc = await Brand.findById(brand._id).lean();
        return {
          brandId: brand._id,
          brandName: brandDoc?.brandName || "Unknown Brand",
          totalQuantity: brand.totalQuantity,
        };
      })
    );
  
    return populatedBrands;
  };
  
  
  const loadDashboard = async (req, res, next) => {
    try {
      const filter = req.query.filter || "monthly";
  
      // Time range filtering
      const matchStage = { status: "delivered" };
      const now = new Date();
  
      if (filter === "daily") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchStage.createdAt = { $gte: startOfDay };
      } else if (filter === "weekly") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
        startOfWeek.setHours(0, 0, 0, 0);
        matchStage.createdAt = { $gte: startOfWeek };
      } else if (filter === "monthly") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchStage.createdAt = { $gte: startOfMonth };
      } else if (filter === "yearly") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        matchStage.createdAt = { $gte: startOfYear };
      }
  
      // Top Products
      const topProducts = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.product._id",
            totalSold: { $sum: "$orderedItems.quantity" },
            name: { $first: "$orderedItems.product.productName" }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]);
  
      // Top Categories
      const topCategories = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.product.category",
            totalSold: { $sum: "$orderedItems.quantity" }
          }
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category"
          }
        },
        { $unwind: "$category" },
        {
          $project: {
            name: "$category.name",
            totalSold: 1
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]);
  
      // Top Brands
      const topBrands = await getTopBrands(matchStage);
  
      res.render("dashboard", {
        filter,
        topProducts,
        topCategories,
        topBrands
      });
    } catch (error) {
      next(error);
    }
  };


// Admin Error Page
const pageError = (req, res) => {
    res.render("admin-error", { errorMessage: "Oops! Something went wrong." })
}

// Logout Functionality
const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.redirect("/admin/pageError");
            }
            res.redirect("/admin/login");
        });
    } catch (error) {
        console.error("Unexpected error during logout:", error);
        res.redirect("/admin/pageError");
    }
};


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
}
