const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const mongoose = require("mongoose");

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
      product: {},
    });
  } catch (error) {
    console.error("Error fetching product add page data:", error);
    return res.redirect("/admin/add-products?error=Failed to load data");
  }
};

const addProducts = async (req, res) => {
  
  try {
    const {
      productName,
      description,
      regularPrice,
      category,
      brand,
      quantity,
      size,
      color,
      salePrice,
    } = req.body;

    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        
        try {
          if (!file.mimetype.startsWith("image/")) {
            return res
              .status(400)
              .json({ success:true, message: "Only image files are allowed." });
          }
          const originalImagePath = file.path;
          const resizedImagePath = path.join(
            "public",
            "uploads",
            "product-images",
            file.filename
          );

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
    const categoryData = await Category.findOne(
      { name: categoryName },
      { _id: 1, categoryOffer: 1 }
    );
    const brand1 = await Brand.findOne({ brandName: brandName });

    if (!categoryData)
      return res.redirect("/admin/add-products?error=Category not found");
    if (!brand1)
      return res.redirect("/admin/add-products?error=Brand not found");
    let discountAmount;
    if (categoryData.categoryOffer > 0) {
      discountAmount =
        regularPrice - (regularPrice * categoryData.categoryOffer) / 100;
    } else {
      discountAmount = regularPrice;
    }
    // Insert product
    const newProduct = new Product({
      productName,
      description,
      brand: brand1._id,
      category: categoryData._id,
      regularPrice,
      salePrice: discountAmount,
      quantity,
      size,
      categoryOffer: categoryData.categoryOffer,
      color,
      productImage: images,
      status: "Available",
      createdOn: new Date(),
    });

    await newProduct.save();

    return res.redirect(
      "/admin/products?success=Product added successfully"
    );
  } catch (error) {
    console.error("Error saving product", error);
    return res.redirect("/admin/add-products?error=Failed to add product");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // 🔍 Find brand IDs that match the search query
    const matchingBrands = await Brand.find({
      name: { $regex: search, $options: "i" },
    }).select("_id");
    const brandIds = matchingBrands.map((brand) => brand._id);

    const products = await Product.find({
      $or: [
        { productName: { $regex: search, $options: "i" } },
        { brand: { $in: brandIds } },
      ],
    })  
      // .sort({ createdAt: -1 })
      // .populate("category")
      // .populate("brand")
      // .skip(skip)
      // .limit(limit);

      .sort({ createdAt:-1 })
      .limit(limit)
      .skip(skip)
      .populate("brand")
      .populate("category")
      .exec();

    const totalProducts = await Product.countDocuments({
      $or: [
        { productName: { $regex: search, $options: "i" } },
        { brand: { $in: brandIds } },
      ],
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
        brand: brands,
      });
    } else {
      res.render("page_404");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/pageError");
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const product = await Product.findById(productId);

    if (!product)
      return res.json({ status: false, message: "Product not found" });

    const category = await Category.findById(product.category);

    if (category.categoryOffer >= percentage) {
      return res.json({ status: false, message: "Category offer is higher" });
    }

    product.salePrice =
      product.regularPrice -
      Math.floor(product.regularPrice * (percentage / 100));

    product.productOffer = percentage;

    await product.save();
    // await Category.findByIdAndUpdate(product.category, { categoryOffer: 0 });

    res.json({ status: true });
  } catch (error) {
    console.error("Error adding product offer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product)
      return res.json({ status: false, message: "Product not found" });
    const category = await Category.findById(product.category);
    console.log(category.categoryOffer);
    if (category && category.categoryOffer > 0) {
      product.salePrice = Math.round(
        product.regularPrice * (1 - category.categoryOffer / 100)
      );
    } else {
      product.salePrice = product.regularPrice;
    }
    // product.salePrice = product.salePrice + Math.floor(product.regularPrice * (product.productOffer / 100));
    product.productOffer = 0;

    await product.save();
    res.json({ status: true });
  } catch (error) {
    console.error("Error removing product offer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const blockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.findByIdAndUpdate(id, { isBlocked: true });
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error blocking product:", error);
    res.redirect("/pageError");
  }
};

const unblockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.findByIdAndUpdate(id, { isBlocked: false });
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error unblocking product:", error);
    res.redirect("/pageError");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const { id } = req.query;
    const product = await Product.findById(id);

    if (!product) return res.redirect("/pageError");

    const categories = await Category.find();
    const brands = await Brand.find();
    res.render("edit-Products", {
      product,
      cat: categories,
      brand: brands,
      currentPage: "edit-Products",
    });
  } catch (error) {
    console.error("Error fetching product for editing:", error);
    res.redirect("/admin-error");
  }
};

const editProducts = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    }).lean();

    if (existingProduct) {
      return res.status(400).json({
        error: "Product with this name already exists, please try another name",
      });
    }

    // Handle image validation
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (!file.mimetype.startsWith("image/")) {
          return res
            .status(400)
            .json({ error: "Only image files are allowed." });
        }
        images.push(file.filename);
      }
    }
    console.log("consoling",data.category)
    const categoryData = await Category.findOne(
      { _id: data.category },
      { _id: 1, categoryOffer: 1 }
    );

    let discountAmount;
    if (
      categoryData.categoryOffer > 0 &&
      categoryData.categoryOffer > product.productOffer
    ) {
      discountAmount =
        data.regularPrice -
        (data.regularPrice * categoryData.categoryOffer) / 100;
    } else if (product.productOffer > 0) {
      discountAmount =
        data.regularPrice - (data.regularPrice * product.productOffer) / 100;
    } else {
      discountAmount = data.regularPrice;
    }
    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category:categoryData._id,
      regularPrice: data.regularPrice,
      salePrice:discountAmount,
      quantity: data.quantity,
      size: data.size,
      color: data.color,
      categoryOffer:categoryData.categoryOffer,
      productOffer:product.productOffer,
    };

    if (images.length > 0) {
      updateFields.$push = { productImage: { $each: images } };
    }

    await Product.findByIdAndUpdate(id, updateFields, { new: true });

    return res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Internal Server Error" });
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
      return res
        .status(404)
        .json({ status: false, message: "Product not found" });
    }

    product.productImage.splice(imageIndex, 1);
    await product.save();

    const imagePath = path.join(
      __dirname,
      "../../public/uploads/product-images",
      imageNameToServer
    );

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`Image ${imageNameToServer} not found`);
    }

    res.json({ status: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error in deleteSingleImage:", error);
    res.status(500).json({
      status: false,
      message: "An error occurred while deleting the image",
    });
  }
};

const loadInventory = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 7;

    const brand = await Brand.findOne({
      brandName: { $regex: search, $options: "i" },
    });
    const category = await Category.findOne({
      name: { $regex: search, $options: "i" },
    });

    const productData = await Product.find({
      $or: [
        { productName: { $regex: search, $options: "i" } },
        { brand: brand ? brand._id : null },
        { category: category ? category._id : null },
      ],
    })  
      .sort({ createdAt:-1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("brand")
      .populate("category")
      .exec();

    const count = await Product.find({
      $or: [
        { productName: { $regex: search, $options: "i" } },
        { brandId: brand ? brand._id : null },
        { categoryId: category ? category._id : null },
      ],
    }).countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.render("inventory", {
      product: productData,
      currentPage: page,
      totalPages: totalPages,
      searched: search,
    });
  } catch (error) {
    console.error(error);
  }
};

const updateInventory = async (req, res) => {
  try {
    const productId = req.query.id;
    const stock = req.body.quantity;

    const newQuantity = await Product.findByIdAndUpdate(
      productId,
      { $set: { quantity: stock } },
      { new: true }
    );
    if (newQuantity) {
      return res
        .status(200)
        .json({ success: true, message: "Stock updated successfully" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Stock updation failed" });
    }
  } catch (error) {}
};
module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProducts,
  deleteSingleImage,
  loadInventory,
  updateInventory,
};
