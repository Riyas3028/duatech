const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Wallet=require("../../models/walletSchema")

const loadOrderDetails = async (req, res) => {
  try {
    let search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Sorting
    let sortField = req.query.sortField || "createdAt";
    let sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Filtering
    let filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // Search (Order ID or User Name)
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { "userId.name": { $regex: search, $options: "i" } }
      ];
    }

    // Fetch Orders
    const orders = await Order.find(filter)
      .populate("userId")
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("adminOrders", {
      orders,
      search,
      currentPage: page,
      totalPages,
      sortField,
      sortOrder,
      status: req.query.status || "all"
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
const viewOrderDetails = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);

    const order = await Order.findById(id)
      .populate("orderedItems.product")
      .populate("userId")
      .lean();

    if (order) {
      const userId = order.userId;
      const addressDoc = await Address.findOne({ userId: userId }).lean();

      const userAddress = addressDoc.address.find(
        (addr) => addr._id.toString() === order.address.toString()
      );

      order.address = userAddress;

      res.render("adminOrderDetails", { order: order, currentPage: "orders" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "order not found" });
    }
  } catch (error) {
    console.errror(error);
    res.redirect("/pageNotFound");
  }
};

const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: status } },
      { new: true }
    );
    if (order) {
      return res
        .status(200)
        .json({ success: true, message: "order updated successfully" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "order not found" });
    }
  } catch (error) {
    console.error(error);
    res.render("pageerror");
  }
};

const orderCancel = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { status: "cancelled" } },
      { new: true }
    );

    const orderedItems = order.orderedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    console.log(orderedItems);
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
    res.redirect("/pageNotFound");
  }
};


const handleReturn = async (req, res) => {
  try {
    const { action } = req.body;
    if (action === "approved") {
      const { orderId } = req.body;

      const order = await Order.findByIdAndUpdate(
        orderId,
        { $set: { requestStatus: action } },
        { new: true }
      );
      if (order) {
        return res
          .status(200)
          .json({ success: true, message: "return approved successfully" });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "order not found" });
      }
    } else if (action === "rejected") {
      const { orderId, category, message } = req.body;

      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            requestStatus: action,
            rejectionCategory: category,
            rejectionReason: message,
          },
        },
        { new: true }
      );
      if (order) {
        return res
          .status(200)
          .json({ success: true, message: "return request rejected" });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "order not found" });
      }
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const updateReturnStatus=async(req,res)=>{
  try {
    const { orderId,status } = req.body;
    if (status === "returning") {

      const order = await Order.findByIdAndUpdate(
        orderId,
        { $set: { status: status,updatedAt:new Date()} },
        { new: true }
      );
      if (order) {
        return res
          .status(200)
          .json({ success: true, message: "returning initialised successfully" });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "order not found" });
      }
    } else if (status === "returned") {
      
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            status: status,updatedAt:new Date()
          },
        },
        { new: true }
      );
      const orderData = await Order.findById(orderId);
      const userId = orderData.userId;

      let wallet = await Wallet.findOne({ userId: userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      wallet.balance += parseInt(orderData.finalAmount);

      wallet.transactions.push({
        amount:orderData.finalAmount,
        type: "credit",
        description: "Order return Refund",
      });

      await wallet.save();
      if (order) {
        return res
          .status(200)
          .json({ success: true, message: "returned succefully" });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "order not found" });
      }
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};


module.exports = {
  loadOrderDetails,
  viewOrderDetails,
  updateStatus,
  orderCancel,
  handleReturn,
  updateReturnStatus
};
