const User=require('../models/userSchema')







const userAuth=(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data&&!data.isBlocked){
                next()
            }else{
                res.redirect('/login')
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware",error)
            res.status(500).send("Internal server error")
        })
    }else{
        res.redirect('/login')
    }
}

// const adminAuth=(req,res,next)=>{
//     User.findOne({isAdmin:true})
//     .then(data=>{
//         if(data){
//             next()
//         }else{
//             res.redirect('/admin/login')
//         }
//     })
//     .catch(error=>{
//         console.log("Error in adminAuth middleware",error)
//         res.status(500).send("Internal server Error")
//     })
// }

const adminAuth = async (req, res, next) => {
    console.log("Session ID:", req.session.admin); // ✅ Debug session
    try {
        if (!req.session.admin) {
            console.log("No session found – Redirecting to login");
            return res.redirect('/admin/login');
        }

        const user = await User.findById(req.session.admin);
        if (user && user.isAdmin) {
            console.log("Admin authenticated");
            next();
        } else {
            console.log("User not admin – Redirecting to login");
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.log("Error in adminAuth middleware", error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports={
    userAuth,
    adminAuth
}