const Brand = require('../../models/brandSchema');
const Product= require('../../models/productSchema')
const fs=require('fs')

const getBrandPage = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        const limit = 8;
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;
        const brandData = await Brand.find({})
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit);

        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);

        res.render('brands', {
            data: brandData,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands
        });

    } catch (error) {
        console.error("Error fetching brands:", error);
        res.redirect("/pageError");
    }
};

const addBrand = async (req, res) => {
    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({ brandName:brand });

        if (!findBrand) {
            const image = req.file.filename;
            const newBrand = new Brand({
                brandName: brand,
                brandImage: image,
            });

            await newBrand.save();
            return res.redirect('/admin/brands?success=Brand added successfully');
        } else {
            return res.redirect('/admin/brands?error=Brand already exists');
        }
    } catch (error) {
        return res.redirect("/admin/brands?error=Something went wrong");
    }
};

const blockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
        return res.redirect('/admin/brands?success=Brand blocked successfully');
    } catch (error) {
        return res.redirect("/admin/brands?error=Failed to block brand");
    }
};
const unBlockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
        return res.redirect('/admin/brands?success=Brand unblocked successfully');
    } catch (error) {
        return res.redirect("/admin/brands?error=Failed to unblock brand");
    }
};
const deleteBrand = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.redirect("/admin/brands?error=Invalid brand ID");
        }

        await Brand.deleteOne({ _id: id });
        return res.redirect('/admin/brands?success=Brand deleted successfully');
    } catch (error) {
        return res.redirect('/admin/brands?error=Error deleting brand');
    }
};



const geteditBrand = async (req, res) => {
    try {
        const brandId = req.query.id; // Get brand ID from query parameters
        const brand = await Brand.findById(brandId); // Find brand by ID
        
        if (!brand) {
            return res.status(404).send("Brand not found");
        }
        
        res.render('editBrand', { brand:brand,currentPage: "editBrand"  }); // Render the 'editBrand' view with brand data
    } catch (error) {
        console.error("Error loading brand:", error);
        res.status(500).send("Internal Server Error");
    }
};


const editBrand = async (req, res) => {
    try {
        const { brandName } = req.body;
        const brandId = req.params.id;
    
        const existingBrand = await Brand.findById(brandId);
        if (!existingBrand) {
            return res.status(404).json({ error: "Brand not found" });
        }

        // Check for duplicate brand name
        const duplicateBrand = await Brand.findOne({
            brandName,
            _id: { $ne: brandId }
        });
        if (duplicateBrand) {
            return res.status(400).json({ error: "Brand already exists" });
        }

        let updateFields = { brandName }; // Store fields to update

        // Handle image upload
        let images;

        if (req.file) {
           images = req.file.filename;    
            console.log("Uploaded images:", images);
        }

        if (images.length > 0) {
            updateFields.brandImage=images ;
        }
        
        // Update brand document
        await Brand.findByIdAndUpdate(brandId, updateFields, { new: true });
        
        res.status(200).json({ message: "Brand updated successfully" });
    } catch (error) {
        console.error("Error updating brand:", error);
        res.status(500).json({ error: "Failed to update brand" });
    }
};




module.exports = { 
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
    geteditBrand,
    editBrand,

 };
