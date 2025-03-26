const path = require("path");
const User = require("../../models/userSchema");

// 📌 Fetch Customers List (with Pagination & Search)
const customerInfo = async (req, res) => {
    try {
        let search = req.query.search ? req.query.search.trim() : "";
        let page = parseInt(req.query.page) || 1;
        const limit = 8;

        // ✅ Query to fetch non-admin users matching search criteria
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        // ✅ Get total customer count for pagination
        const totalCustomers = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        });

        const totalPages = Math.ceil(totalCustomers / limit);

        // ✅ Render the correct `admin/customers.ejs` file
        res.render(path.join(__dirname, "../../views/admin/customers"), {
            customers: userData,
            currentPage: page,
            totalPages,
            search
        });

    } catch (error) {
        console.error("🚨 Error fetching customers:", error);
        res.redirect("/admin/pageerror");
    }
};

// 📌 Block Customer
const blockCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            console.error("🚨 Error: Missing customer ID to block");
            return res.redirect("/admin/customers");
        }

        await User.findByIdAndUpdate(id, { isBlocked: true });
        res.redirect("/admin/customers");

    } catch (error) {
        console.error("🚨 Error blocking customer:", error);
        res.redirect("/admin/pageerror");
    }
};

// 📌 Unblock Customer
const unblockCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            console.error("🚨 Error: Missing customer ID to unblock");
            return res.redirect("/admin/customers");
        }

        await User.findByIdAndUpdate(id, { isBlocked: false });
        res.redirect("/admin/customers");

    } catch (error) {
        console.error("🚨 Error unblocking customer:", error);
        res.redirect("/admin/pageerror");
    }
};

// 📌 Exporting the Controller Functions
module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer
};
