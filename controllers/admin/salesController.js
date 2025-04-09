const Order = require("../../models/orderSchema");

const loadSales = async (req, res, next) => {
  try {
    const range = req.query.range || "daily"; // default to daily
    const now = new Date();
    let startDate, endDate;

    if (range === "daily") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (range === "weekly") {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + diffToMonday);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "custom") {
      startDate = new Date(req.query.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.to);
      endDate.setHours(23, 59, 59, 999);
    }

    const orders = await Order.find({
      status: "delivered",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    let totalSales = 0;
    let totalOrders = orders.length;
    let totalProducts = 0;
    let totalDiscounts = 0;
    let totalPrice = 0;

    orders.forEach((item) => {
      totalSales += item.totalPrice;
      totalProducts += item.orderedItems.length;
      totalDiscounts += item.discount;
      totalPrice += item.finalAmount;
    });

    const netRevenue = totalSales - totalDiscounts;
    const averageOrderValue = totalOrders > 0 ? totalPrice / totalOrders : 0;

    const salesData = {
      months: ["Jan", "Feb", "Mar", "Apr"],
      sales: [0, 0, 0, netRevenue],
      orders: [30, 50, 40, 60],
    };

    res.render("sales", {
      totalSales,
      totalOrders,
      totalProducts,
      totalDiscounts,
      netRevenue,
      averageOrderValue,
      salesData,
      range,
      from: req.query.from,
      to: req.query.to,
    });
  } catch (error) {
    next(error);
  }
};

const loadSalesReport = async (req, res, next) => {
  try {
    const range = req.query.range || "daily"; // default to daily
    const now = new Date();
    let startDate, endDate;

    if (range === "daily") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (range === "weekly") {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + diffToMonday);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "custom") {
      startDate = new Date(req.query.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.to);
      endDate.setHours(23, 59, 59, 999);
    }

    const orders = await Order.find({
      status: "delivered",
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate('userId');

    let totalSales = 0;
    let totalOrders = orders.length;
    let totalProducts = 0;
    let totalDiscounts = 0;
    let totalPrice = 0;

    orders.forEach((item) => {
      totalSales += item.totalPrice;
      totalProducts += item.orderedItems.length;
      totalDiscounts += item.discount;
      totalPrice += item.finalAmount;
    });

    const netRevenue = totalSales - totalDiscounts;
    const averageOrderValue = totalOrders > 0 ? totalPrice / totalOrders : 0;

    const salesData = {
      months: ["Jan", "Feb", "Mar", "Apr"],
      sales: [0, 0, 0, netRevenue],
      orders: [30, 50, 40, 60],
    };

    res.render("salesReport", {
      totalSales,
      totalOrders,
      totalProducts,
      totalDiscounts,
      netRevenue,
      averageOrderValue,
      salesData,
      range,
      from: req.query.from,
      to: req.query.to,
      orders,
      startDate,
      endDate,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = { loadSales, loadSalesReport };
