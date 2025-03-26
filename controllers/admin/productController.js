const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const mongoose=require('mongoose')

const getProductAddPage = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });

        res.render("add-products", {
            cat: categories,
            brand: brands,
            currentPage: "add-products",
            error: req.query.error || null,
            success: req.query.success || null,
            product: {} 
        });
    } catch (error) {
        console.error("Error fetching product add page data:", error);
        return res.redirect("/admin/add-products?error=Failed to load data");
    }
};

// Add Product
const addProducts = async (req, res) => {
    try {
        const { productName, description, regularPrice, category, brand, quantity, size, color, salePrice } = req.body;
        console.log(req.body)
        console.log(req.files)
        // if (!productName || !description || !regularPrice || !category || !brand) {
        //     return res.redirect("/admin/add-products");
        // }

        let images = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const originalImagePath = file.path;
                    const resizedImagePath = path.join("public", "uploads", "product-images", file.filename);

                    await sharp(originalImagePath)
                        .resize({ width: 440, height: 440 })
                        .jpeg({ quality: 80 })
                        .toFile(resizedImagePath);

                    images.push(file.filename);
                } catch (imageError) {
                    console.error("Error processing image:", imageError);
                }
            }
        }

       
        const categoryName = req.body.category;
const brandName = req.body.brand;

// Find category by name and get ObjectId
const category1 = await Category.findOne({ name: categoryName });
const brand1 = await Brand.findOne({ brandName: brandName });

if (!category1) return res.redirect("/admin/add-products?error=Category not found");
if (!brand1) return res.redirect("/admin/add-products?error=Brand not found");

console.log("Category ID:", category1._id); 
console.log("Brand ID:", brand1._id);
console.log("Category Name:", categoryName);
console.log("Brand Name:", brandName);
console.log("Category ID:", category1 ? category1._id : "Not Found");
console.log("Brand ID:", brand1 ? brand1._id : "Not Found");



        // Insert product
        const newProduct = new Product({
            productName,
            description,
            brand:brand1._id,
            category:category1._id,
            regularPrice,
            salePrice: req.body.salePrice || req.body.regularPrice,
            quantity,
            size,
            color,
            productImage:images,
            status: "Available",
            createdOn: new Date(),
        });

        await newProduct.save();

        return res.redirect('/admin/add-products?success=Product added successfully');
    } catch (error) {
        console.error("Error saving product", error);
        return res.redirect("/admin/add-products?error=Failed to add product");
    }
};

// Get All Products
const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        // 🔍 Find brand IDs that match the search query
        const matchingBrands = await Brand.find({ name: { $regex: search, $options: "i" } }).select("_id");
        const brandIds = matchingBrands.map(brand => brand._id);

        const products = await Product.find({
            $or: [
                { productName: { $regex: search, $options: "i" } },
                { brand: { $in: brandIds } } 
            ]
        })
        .populate("category")
        .populate("brand") 
        .skip(skip)
        .limit(limit);

        const totalProducts = await Product.countDocuments({
            $or: [
                { productName: { $regex: search, $options: "i" } },
                { brand: { $in: brandIds } }
            ]
        });

        const totalPages = Math.ceil(totalProducts / limit);

        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });

        if (categories && brands) {
            res.render("products", {
                data: products,
                currentPage: page,
                totalPages,
                cat: categories,
                brand: brands
            });
        } else {
            res.render("page_404");
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        res.redirect('/pageError');
    }
};

// Add Product Offer
const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        const product = await Product.findById(productId);

        if (!product) return res.json({ status: false, message: "Product not found" });

        const category = await Category.findById(product.category);

        if (category.categoryOffer > percentage) {
            return res.json({ status: false, message: "Category offer is higher" });
        }

        product.salePrice = product.regularPrice -Math.floor(product.regularPrice * (percentage / 100));
        console.log(product.salePrice)
        product.productOffer = percentage;

        await product.save();
        await Category.findByIdAndUpdate(product.category, { categoryOffer: 0 });

        res.json({ status: true });
    } catch (error) {
        console.error("Error adding product offer:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

// Remove Product Offer
const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await Product.findById(productId);

        if (!product) return res.json({ status: false, message: "Product not found" });

        product.salePrice = product.salePrice + Math.floor(product.regularPrice * (product.productOffer / 100));
        product.productOffer = 0;

        await product.save();
        res.json({ status: true });
    } catch (error) {
        console.error("Error removing product offer:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

// Block Product
const blockProduct = async (req, res) => {
    try {
        const id = req.query.id;
        await Product.findByIdAndUpdate(id, { isBlocked: true });
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error blocking product:", error);
        res.redirect('/pageError');
    }
};

// Unblock Product
const unblockProduct = async (req, res) => {
    try {
        const id = req.query.id;
        await Product.findByIdAndUpdate(id, { isBlocked: false });
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error unblocking product:", error);
        res.redirect('/pageError');
    }
};

// Get Edit Product
const getEditProduct = async (req, res) => {
    try {
        const { id } = req.query;
        const product = await Product.findById(id);
        console.log(product)

        if (!product) return res.redirect("/pageError");

        const categories = await Category.find();
        const brands = await Brand.find();
        res.render("edit-Products", { product, cat: categories, brand: brands, currentPage: "edit-Products" });

        
    } catch (error) {
        console.error("Error fetching product for editing:", error);
        res.redirect('/admin-error');
    }
};



const editProducts = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        // Check if the product exists
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Check if another product already has the same name
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        }).lean();

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists, please try another name" });
        }

        // Handle new images
        const images = req.files ? req.files.map(file => file.filename) : [];

        // Fields to update
        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: data.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color,
        };

        // Only update images if new ones are uploaded
        if (images.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        console.log("Product update completed");
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Internal Server Error" }); 
    }
};

// const deleteSingleImage = async (req, res) => {
//     try {
//         const { imageNameToServer, productToServer,imageIndex } = req.body;

//         const product = await Product.findById(productToServer);
//         if (!product) {
//             return res.status(404).json({ error: "Product not found" });
//         }

//         // Remove image reference from product document
//         product.productImage.splice(imageIndex, 1);
//     await product.save();

//         // Remove image from the server
//         const imagePath = path.join(__dirname,"../../public/uploads/product-images", imageNameToServer);
//         if (fs.existsSync(imagePath)) {
//             fs.unlinkSync(imagePath);
//             console.log(`Image ${imageNameToServer} deleted successfully`);
//         } else {
//             console.log(`Image ${imageNameToServer} not found`);
//         }

//         res.json({ status: true, message: "Image deleted successfully" });
//     } catch (error) {
//         console.error("Error deleting image:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };

const deleteSingleImage = async (req, res) => {
    try {
      const { imageNameToServer, productIdToServer, imageIndex } = req.body;
      const product = await Product.findById(productIdToServer);
  
      if (!product) {
        return res.status(404).json({ status: false, message: "Product not found" });
      }
  
      
      product.productImage.splice(imageIndex, 1);
      await product.save();
  
      const imagePath = path.join(__dirname, "../../public/uploads/product-images", imageNameToServer);
  
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Image ${imageNameToServer} deleted successfully`);
      } else {
        console.log(`Image ${imageNameToServer} not found`);
      }
  
      res.json({ status: true, message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error in deleteSingleImage:", error);
      res.status(500).json({ status: false, message: "An error occurred while deleting the image" });
    }
  };
  

module.exports = { 
    getProductAddPage,
     addProducts,
      getAllProducts,
       addProductOffer,
        removeProductOffer,
         blockProduct,
          unblockProduct, 
          getEditProduct ,
          editProducts,
          deleteSingleImage
        };
