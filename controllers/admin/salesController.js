const Order = require("../../models/orderSchema");

const loadSales = async (req, res, next) => {
  try {
    const range = req.query.range || "daily";
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

    const orders = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$totalPrice" },
                totalDiscounts: { $sum: "$discount" },
                totalPrice: { $sum: "$finalAmount" },
                totalOrders: { $sum: 1 },
                totalProducts: { $sum: { $size: "$orderedItems" } },
              },
            },
          ],
          monthlyStats: [
            {
              $group: {
                _id: { $month: "$createdAt" },
                netRevenue: { $sum: { $subtract: ["$totalPrice", "$discount"] } },
                orderCount: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 }, 
            },
          ],
        },
      },
      {
        $project: {
          totalSales: { $arrayElemAt: ["$overallStats.totalSales", 0] },
          totalDiscounts: { $arrayElemAt: ["$overallStats.totalDiscounts", 0] },
          totalPrice: { $arrayElemAt: ["$overallStats.totalPrice", 0] },
          totalOrders: { $arrayElemAt: ["$overallStats.totalOrders", 0] },
          totalProducts: { $arrayElemAt: ["$overallStats.totalProducts", 0] },
          monthlyStats: 1,
        },
      },
    ]);
    
    const stats = orders[0] || {
      totalSales: 0,
      totalDiscounts: 0,
      totalPrice: 0,
      totalOrders: 0,
      totalProducts: 0,
      monthlyStats: [],
    };
    
    const netRevenue = stats.totalSales - stats.totalDiscounts;
    const averageOrderValue = stats.totalOrders > 0 ? stats.totalPrice / stats.totalOrders : 0;
    
    
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sales = Array(12).fill(0);
    const ordersCount = Array(12).fill(0);
    
    stats.monthlyStats.forEach((monthData) => {
      const index = monthData._id - 1; 
      sales[index] = monthData.netRevenue;
      ordersCount[index] = monthData.orderCount;
    });
    
    const salesData = {
      months: monthLabels,
      sales,
      orders: ordersCount,
    };
    
    res.render("sales", {
      totalSales: stats.totalSales || 0,
      totalOrders: stats.totalOrders || 0,
      totalProducts: stats.totalProducts || 0,
      totalDiscounts: stats.totalDiscounts || 0,
      netRevenue: netRevenue || 0,
      averageOrderValue: averageOrderValue || 0,
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

    const orders = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: "users", 
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$totalPrice" },
                totalDiscounts: { $sum: "$discount" },
                totalPrice: { $sum: "$finalAmount" },
                totalOrders: { $sum: 1 },
                totalProducts: { $sum: { $size: "$orderedItems" } },
              },
            },
          ],
          monthlyStats: [
            {
              $group: {
                _id: { $month: "$createdAt" },
                netRevenue: { $sum: { $subtract: ["$totalPrice", "$discount"] } },
                orderCount: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          detailedOrders: [
            {
              $sort: { createdAt: -1 },
            },
          ],
        },
      },
      {
        $project: {
          totalSales: { $arrayElemAt: ["$overallStats.totalSales", 0] },
          totalDiscounts: { $arrayElemAt: ["$overallStats.totalDiscounts", 0] },
          totalPrice: { $arrayElemAt: ["$overallStats.totalPrice", 0] },
          totalOrders: { $arrayElemAt: ["$overallStats.totalOrders", 0] },
          totalProducts: { $arrayElemAt: ["$overallStats.totalProducts", 0] },
          monthlyStats: 1,
          detailedOrders: 1,
        },
      },
    ]);
    
    const stats = orders[0] || {
      totalSales: 0,
      totalDiscounts: 0,
      totalPrice: 0,
      totalOrders: 0,
      totalProducts: 0,
      monthlyStats: [],
      detailedOrders: [],
    };
    
    const netRevenue = stats.totalSales - stats.totalDiscounts;
    const averageOrderValue =
      stats.totalOrders > 0 ? stats.totalPrice / stats.totalOrders : 0;
    
    // Monthly data
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sales = Array(12).fill(0);
    const ordersCount = Array(12).fill(0);
    
    stats.monthlyStats.forEach((monthData) => {
      const index = monthData._id - 1;
      sales[index] = monthData.netRevenue;
      ordersCount[index] = monthData.orderCount;
    });
    
    const salesData = {
      months: monthLabels,
      sales,
      orders: ordersCount,
    };
    
    res.render("salesReport", {
      totalSales: stats.totalSales || 0,
      totalOrders: stats.totalOrders || 0,
      totalProducts: stats.totalProducts || 0,
      totalDiscounts: stats.totalDiscounts || 0,
      netRevenue: netRevenue || 0,
      averageOrderValue: averageOrderValue || 0,
      salesData: salesData || { months: [], sales: [], orders: [] },
      range,
      from: req.query.from,
      to: req.query.to,
      orders: stats.detailedOrders || [],
      startDate,
      endDate,
    });  
  } catch (error) {
    next(error);
  }
};

module.exports = { loadSales, loadSalesReport };