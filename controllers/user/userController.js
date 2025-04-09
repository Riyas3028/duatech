const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const Category=require('../../models/categorySchema')
const Product=require('../../models/productSchema')
const Banner=require('../../models/bannerSchema')
const Wallet=require('../../models/walletSchema')
// 404 Page Not Found
const pageNotFound = async (req, res) => {
    try {
        res.render("page_404");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

// Load Signup Page
const loadsignup = async (req, res) => {
    try {
        return res.render("signup");
    } catch (error) {
        console.log("Page not found");
        res.status(500).send("Server error");
    }
};

// Load Homepage
const loadHomepage = async (req, res) => {
    try {
        const today = new Date().toISOString();
        let banners = await Banner.find({
            startDate: { $lte: new Date(today) },
            endDate: { $gt: new Date(today) }
        })
        const categories = await Category.aggregate([
            {
                $match: { isListed: true }
            },
            {
                $lookup: {
                    from: "products", // Collection name (should match MongoDB)
                    localField: "_id",
                    foreignField: "category",
                    as: "products"
                }
            },
            {
                $project: {
                    name: 1,
                    image: 1,
                    productCount: { $size: "$products" } // Count the number of products
                }
            }
        ]);

         // Get products with 50% or more discount
         const discountProducts = await Product.find({
            isBlocked: false,
            quantity: { $gt: 0 },
            $expr: {
                $gte: [
                    {
                        $divide: [
                            { $subtract: ["$regularPrice", "$salePrice"] },
                            "$regularPrice"
                        ]
                    },
                    0.5 // 50% discount
                ]
            }
        })
            .populate({ path: "category", select: "name" })
            .populate({ path: "brand", select: "brandName" })
            .limit(8); // Show max 9 products


        let productData=await Product.find(
        {isBlocked:false,quantity:{$gt:0}})
        .populate({ path: "category", select: "name" })
        .populate({ path: "brand", select: "brandName" })
        .sort({createdAt:-1})
        .limit(8)
        // productData.sort((a,b)=>new Date(b.createdAt)- new Date(a.createdAt))
        productData=productData.slice(0,8)
         const userId = req.session.user;
        if (userId) {
            const userData = await User.findOne({ _id: userId });
            return res.render("home", { user: userData , products:productData,banners:banners||[],categories:categories,discountProducts:discountProducts});
            // banner:findBanner||[]
        } else {
            return res.render("home", {user:null,products:productData,banners:banners,categories:categories,discountProducts:discountProducts});
            // banner:findBanner||[]
        }
    } catch (error) {
        console.log("Home page not found", error);
        res.status(500).send("Server error"); 
    }
};



// Generate OTP
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send Verification Email
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            html: `<b>Your OTP: ${otp}</b>`,
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

// Secure Password Hashing
const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Password hashing error", error);
        return null;
    }
};

// Signup Route
const signup = async (req, res) => {
    try {
        const { name, phone, email, password, cpassword ,referral} = req.body;
        // console.log(req.body);
        

        if (password !== cpassword) {
            return res.render("signup", { message: "Passwords do not match" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }
        const hashedPassword = await securePassword(password);
        if (!hashedPassword) {
            return res.render("signup", { message: "Error processing password" });
        }
        if(referral &&referral.trim()){
        const referralCode = referral.toUpperCase();
        const referredUser = await User.findOne({referralCode:referralCode})
        if(!referredUser){
         return res.json({success:false, message:"Not a Valid Refferal Code"});
        }
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json({ success: false, message: "Error sending email" });
        }
        
        req.session.userOtp = otp;
        req.session.userData = { email, password: hashedPassword, name, phone,referral };

        res.render("verify-otp");
        console.log("OTP Sent for login:", otp);
    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
    }
};

function generateReferralCode(input) {

    if (!input || typeof input !== 'string') return null;
  
  
    const base = input.substring(0, 4).toUpperCase();
  
  
    const randomNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
    return `${base}${randomNumber}`;
  }

// OTP Verification
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!req.session.userOtp || !req.session.userData) {
            return res.status(400).json({ success: false, message: "Session expired, please sign up again" });
        }

        if (otp.toString() !== req.session.userOtp.toString()) {
            return res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
        }

        const user = req.session.userData;
        let referral=req.session.userData.referral
      referral = referral.toUpperCase();
      let referredUser;
      if(referral && referral.trim()){
      referredUser = await User.findOne({referralCode:referral});
      
      let wallet = await Wallet.findOne({ userId:referredUser._id});
            if (!wallet) {
              wallet = new Wallet({ userId:referredUser._id, balance: 0, transactions: [] });
            }
        
            wallet.balance += 1000;
      
            wallet.transactions.push({ amount:1000, type: "credit", description: "Refferal Reward" });
        
            await wallet.save();
          }


      const referralCode =  generateReferralCode(user.name);
      console.log(referralCode)
        const saveUserData = new User({
            name: user.name,
            email: user.email,
            phone: user.phone,
            password: user.password ,
            referralCode,
            referredBy:referredUser?.name
        });

        await saveUserData.save();
        req.session.user = saveUserData._id;

        return res.json({ success: true, redirectUrl: "/" });
    } catch (error) {
        console.error("Error verifying OTP", error);
        return res.status(500).json({ success: false, message: "An error occurred" });
    }
};


// Resend OTP
const resendOtp = async (req, res) => {
    try {
        if (!req.session.userData || !req.session.userData.email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const { email } = req.session.userData;
        const otp = generateOtp();
        req.session.userOtp = otp;
        console.log("Resent OTP for login:",otp)
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            return res.status(200).json({ success: true, message: "OTP resent successfully" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to resend OTP, please try again" });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error, please try again" });
    }
};

// Load Login Page
const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("login");
        } else {
            res.redirect("/");
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

// Login Route
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email });

        if (!findUser) {
            return res.render("login", { message: "Incorrect E-mail or password" });
        }
        if (findUser.isBlocked) {
            return res.render("login", { message: "Cannot login by using this email " });
        }

        const passwordMatch = bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect E-mail or password" });
        }

        req.session.user = findUser._id;
        res.redirect("/");
    } catch (error) {
        console.error("Login error", error);
        res.render("login", { message: "Login failed, please try again later" });
    }
};

// Logout
const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Session destruction error:", err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login");
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.redirect("/pageNotFound");
    }
};


const loadShoppingPage = async (req, res) => {
    try {
        
        const user = req.session.user;
        const userData = user ? await User.findOne({ _id: user }) : null;

        
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        
        let query = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };

        
        if (req.query.search) {
            query.productName = { $regex: req.query.search, $options: 'i' };
        }

        
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id);
        query.category = { $in: categoryIds };

        
        let sort = {};
        switch (req.query.sort) {
            case 'popularity':
                sort = { popularity: -1 };
                break;
            case 'price_asc':
                sort = { salePrice: 1 };
                break;
            case 'price_desc':
                sort = { salePrice: -1 };
                break;
            case 'rating':
                sort = { averageRating: -1 };
                break;
            case 'featured':
                sort = { featured: -1 };
                break;
            case 'new':
                sort = { createdAt: -1 };
                break;
            case 'name_asc':
                sort = { productName: 1 };
                break;
            case 'name_desc':
                sort = { productName: -1 };
                break;
            default:
                sort = { createdAt: -1 }; 
        }

        
        const categoriesWithCounts = await Category.aggregate([
            {
                $match: { isListed: true }
            },
            {
                $lookup: {
                    from: 'products',
                    let: { categoryId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$category', '$$categoryId'] },
                                        { $eq: ['$isBlocked', false] },
                                        { $gt: ['$quantity', 0] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'products'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    productCount: { $size: '$products' }
                }
            }
        ]);

        
        const products = await Product.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Get total number of products for pagination
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Render shop page with all necessary data
        res.render("shop", {
            user: userData,
            products: products,
            category: categoriesWithCounts,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            search: req.query.search,
            sort: req.query.sort,
            req: req
        });

    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.status(500).redirect("/pageNotFound");
    }
};

const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const category = req.query.category;
        const query = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };

        // If a category is selected, filter by category
        if (category) {
            const findCategory = await Category.findOne({ _id: category });
            if (findCategory) {
                query.category = findCategory._id;
            }
        }

        // Check for search query in the URL
        if (req.query.query) {
            const searchQuery = req.query.query.trim();
            if (searchQuery) {
                // Perform a text search for matching products
                query.$text = { $search: searchQuery };
            }
        }

        // Fetch products based on the filter criteria
        let findProducts = await Product.find(query).lean();

        // Sort products by creation date in descending order
        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const categories = await Category.find({ isListed: true });

        // Get category counts
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const count = await Product.countDocuments({
                    category: category._id,
                    isBlocked: false,
                    quantity: { $gt: 0 }
                });
                return { _id: category._id, name: category.name, productCount: count };
            })
        );

        // Pagination setup
        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);

        // Handle user data and search history
        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: category || null,
                    searchedOn: new Date(),
                    query: req.query.query || null
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filteredProducts = currentProduct;

        // Render the results
        res.render("shop", {
            user: userData,
            products: currentProduct,
            category: categoriesWithCounts,
            totalPages,
            currentPage,
            selectedCategory: category || null,
            searchQuery: req.query.query || ''
        });

    } catch (error) {
        console.error("Error while filtering products:", error);
        res.redirect("/pageNotFound");
    }
};



const searchProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });

        const searchQuery = req.query.search; // Get the search query from the URL
        const categories = await Category.find({ isListed: true });

        // Fetch product count for each category
        const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
            const count = await Product.countDocuments({ 
                category: category._id, 
                isBlocked: false, 
                quantity: { $gt: 0 } 
            });
            return { _id: category._id, name: category.name, productCount: count };
        }));

        // Query products based on the search term
        const products = await Product.find({
            isBlocked: false,
            quantity: { $gt: 0 },
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search
                { description: { $regex: searchQuery, $options: 'i' } }, // Search in description
            ],
        }).sort({ createdOn: -1 });

        // Pagination logic
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / limit);

        const paginatedProducts = products.slice(skip, skip + limit);

        res.render("shop", {
            user: userData,
            products: paginatedProducts,
            category: categoriesWithCounts,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: searchQuery, // Pass the search query to the view
            req: req,
        });

    } catch (error) {
        console.error("Error searching products:", error);
        res.redirect("/pageNotFound");
    }
};

const googleSession=(req,res)=>{
    req.session.user=req.user._id
    res.redirect('/')
}

// Export Modules
module.exports = { 
    loadHomepage, 
    pageNotFound, 
    loadsignup, 
    signup, 
    verifyOtp, 
    resendOtp, 
    loadLogin, 
    login, 
    logout ,
    loadShoppingPage,
    filterProduct,
    searchProducts,
    googleSession,

};
