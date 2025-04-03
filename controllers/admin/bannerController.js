const Banner=require('../../models/bannerSchema')
const path=require('path')
const fs=require('fs')


const getBannerPage=async(req,res)=>{
    try {
        
        const findBanner= await Banner.find({})
        res.render("banners",{currentPage: 'banners',data:findBanner});

    } catch (error) {
        res.redirect("/pageError");
    }
}


const getAddBannerPage=async (req,res)=>{
    try {
        res.render('addBanner',{currentPage: 'banners'})
    } catch (error) {
        res.redirect('/pageError')
    }
}

const addBanner=async(req,res)=>{
    try {

        

        const data=req.body;
        const images=req.file;
        
        const newBanner=new Banner({
            image:images.filename,
            title:data.banner_name,
            description:data.description,
            startDate:new Date(data.startDate+'T00:00:00'),
            endDate:new Date(data.endDate+'T00:00:00'),
            link:data.link,
        })

        await newBanner.save().then((data)=>console.log(data));
        res.redirect('/admin/banners')
        
    } catch (error) {
        // res.redirect('/admin/admin-error')
        console.error("Error adding banner :",error);
        res.status(500).json({ success: false, message: "Internal server error. Please try again." });
    }
}

const deleteBanner=async(req,res)=>{
    try {
        const id=req.query.id;
        await Banner.deleteOne({_id:id}).then((data)=>console.log(data))
        res.redirect('/admin/banners')
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}
module.exports={
    getBannerPage,
    getAddBannerPage,
    addBanner, 
    deleteBanner
}