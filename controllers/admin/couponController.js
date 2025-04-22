const Coupon = require("../../models/couponSchema");

const loadCoupon = async (req, res) => {
    try {
      let page = parseInt(req.query.page) || 1;
      const limit = 8;
      let coupons = await Coupon.find();
  
      for (let coupon of coupons) {
        if (coupon.expireOn < new Date() || coupon.createdOn > new Date()) {
          await Coupon.findByIdAndUpdate(
            coupon._id,
            { $set: { isListed: false } },
            { new: true }
          );
        } else {
          await Coupon.findByIdAndUpdate(
            coupon._id,
            { $set: { isListed: true } },
            { new: true }
          );
        }
      }
  
      const updatedCoupons = await Coupon.find()
        .limit(limit)
        .skip((page - 1) * limit)
  
      const count= await Coupon.countDocuments()
      const totalPages = Math.ceil(count / limit);
  
      return res.render("coupon", { 
        coupons: updatedCoupons,
        currentPage: page,
        totalPages
      });
    } catch (error) {
      console.error(error);
    }
  };

const addCoupon = async (req, res) => {
    try {
        const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;
        // Check if coupon with same name exists
        const existingCoupon = await Coupon.findOne({ name: couponName });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon with this name already exists" });
        }

        // Create a new coupon
        const newCoupon = new Coupon({
            name: couponName,
            createdOn: new Date(startDate + "T00:00:00"),
            expireOn: new Date(endDate + "T00:00:00"),
            offerPrice: parseInt(offerPrice),
            minimumPrice: parseInt(minimumPrice),
        });

        // Save coupon
        await newCoupon.save();
        return res.status(200).json({ success: true, message: "Coupon added successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const editCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        const { name, createdOn, expireOn, offerPrice, minimumPrice } = req.body;

        // Check if another coupon with the same name exists
        const existingCoupon = await Coupon.findOne({ name, _id: { $ne: couponId } });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon with this name already exists" });
        }

        // Update coupon details
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                name,
                createdOn: new Date(createdOn + "T00:00:00"),
                expireOn: new Date(expireOn + "T00:00:00"),
                offerPrice: parseInt(offerPrice),
                minimumPrice: parseInt(minimumPrice),
            },
            { new: true }
        );

        if (updatedCoupon) {
            return res.status(200).json({ success: true, message: "Updated successfully" });
        } else {
            return res.status(400).json({ success: false, message: "Failed to update coupon" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        
        if (deletedCoupon) {
            return res.status(200).json({ success: true, message: "Coupon deleted" });
        } else {
            return res.status(400).json({ success: false, message: "Failed to delete coupon" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { loadCoupon, addCoupon, editCoupon, deleteCoupon };
