const User = require('../../models/userSchema')
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
const loadDashboard = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }
    try {
        res.render('dashboard', { currentPage: "dashboard" });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.redirect('/admin/pageError');
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
