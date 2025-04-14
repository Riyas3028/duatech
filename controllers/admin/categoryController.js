const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('category', {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });

    } catch (error) {
        console.error("Error fetching categories:", error);
        res.redirect("/pageError");
    }
};


const addCategory = async (req, res) => {
    try {
        let { name, description } = req.body;

        if (!name?.trim() || !description?.trim()) {
            return res.status(400).json({ error: "All fields are required" });
        }

        name = name.trim();
        description = description.trim();

        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const newCategory = new Category({ name, description });
        await newCategory.save();

        res.json({ message: "Category added successfully" });

    } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        // Check if any product already has a higher individual offer
        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.json({ status: false, message: "Products within this category already have a higher product offer" });
        }

        // Update category offer
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        // Apply offer discount to all products in this category
        for (const product of products) {
            
            product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (percentage / 100)); // Apply discount
            if(product.productOffer<percentage){
                product.categoryOffer = percentage;
            }
            await product.save();
        }

        res.json({ status: true, message: "Category offer applied successfully" });
    } catch (error) {
        console.error("Error adding category offer:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};


const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(400).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {
                if(product.productOffer>0){
                    product.salePrice=Math.round(product.regularPrice-((product.regularPrice*product.productOffer)/100))
                    product.categoryOffer = 0
                }else{
                product.salePrice = product.regularPrice; // Reset sale price to original
                product.categoryOffer = 0; // Remove product-level offer
                }
                await product.save();
            }
        }

        category.categoryOffer = 0;
        await category.save();

        res.json({ status: true, message: "Category offer removed successfully" });
    } catch (error) {
        console.error("Error removing category offer:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const getListCategory= async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect("/admin/category")

    } catch (error) {
        res.redirect("/pageError")
    }
}

const getUnlistCategory= async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category")

    } catch (error) {
        res.redirect("/pageError")
    }
}

const getEditCategory=async(req,res)=>{
    try {
        const id=req.query.id;
        const category=await Category.findOne({_id:id})
        res.render("edit-category",{category:category,currentPage:"edit-category"})
    } catch (error) {
        res.redirect('/pageError')
    }
}


const editCategory= async (req, res) => {
    try {
        const { categoryName, description } = req.body;
        const { id } = req.params;

        if (!categoryName || !description) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check if the category already exists (excluding the current one)
        const existingCategory = await Category.findOne({
            name: categoryName,
            _id: { $ne: id }
        });

        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        // Update the category
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name: categoryName, description },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json({ success: true, message: "Category updated successfully" });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Server error" });
    }
};




module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory
};
