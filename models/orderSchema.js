const mongoose=require('mongoose')
const {Schema}=mongoose
const {v4:uuidv4}=require('uuid')




const orderSchema=new Schema({   
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    orderedItems:[{
        product:{
            _id: Schema.Types.ObjectId,
            productName: String,
            description: String,
            category: Schema.Types.ObjectId,
            regularPrice: Number,
            salePrice: Number,
            productOffer: Number,
            quantity: Number,
            isBlocked: Boolean,
            productImage: [String],
            status: String,
            brand: Schema.Types.ObjectId,
            
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        landMark:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        altphone:{
            type:String,
            required:true
        }
    },
    invoiceDate:{
        type:Date,
        
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','delivered','Cancelled','Return Requested','returned','returning']
    },
    cancelReason:{
            type:String,
    },
    createdAt:{
        type:Date,
        default:Date.now,
        required:true
    },
    coupenApplied:{
        type:Boolean,
        default:false,

    },
    paymentMethod:{
        type:String,
        enum:['cod','wallet','online payment']
    },
    deliveredAt:{
        type:Date,
        default:Date.now,
    },
    returnReason:{
        type:String,
      },
      returnDescription:{
        type:String,
      },
      returnImage:[{
        type:String,
      }],
      requestStatus:{
        type:String,
        enum:['pending','approved','rejected']
      },
      rejectionCategory:{
        type:String
      },
      rejectionReason:{
        type:String
      },
      updatedAt:{
        type:Date,
      }
      


})



const Order=mongoose.model("Order",orderSchema)
module.exports=Order