const Wallet=require("../../models/walletSchema");
const User = require("../../models/userSchema");



const loadWallet = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const search = req.query.search?.trim() || "";
  
      let wallets = [];
      let totalWallets = 0;
  
      if (search) {
        const matchedWallet = await Wallet.findOne({ "transactions.transactionId": search })
          .populate("userId")
          .lean();
  
        if (matchedWallet) {
          const matchedTransaction = matchedWallet.transactions.find(t => t.transactionId === search);
          if (matchedTransaction) {
            wallets.push({
              ...matchedWallet,
              transactions: [matchedTransaction]
            });
          }
          totalWallets = 1;
        } else {
          const matchedUsers = await User.find({
            name: { $regex: new RegExp(search, "i") }
          }).select("_id");
  
          const matchedUserIds = matchedUsers.map(user => user._id);
  
          wallets = await Wallet.find({ userId: { $in: matchedUserIds } })
            .populate("userId")
            .lean();
  
          totalWallets = wallets.length;
        }
      } else {
        wallets = await Wallet.find()
          .populate("userId")
          .lean();
  
        totalWallets = wallets.length;
      }
  
      res.render("adminWallet", {
        wallets,
        currentPage: page,
        totalPages: 1, 
        search
      });
    } catch (error) {
      next(error);
    }
  };
  
  


module.exports={loadWallet}