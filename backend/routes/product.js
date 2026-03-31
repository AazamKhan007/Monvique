const express = require("express");
const {
  handleGetAllProducts,
  handleGetProductDetail,
  createNewProduct,
  handleUpdateProductById,
  handleDeleteProductById,
  handleUpsertCartItem,
  handleBuyNow,
  handleGetCart,
  handleUpdateCartQuantity,
  handleRemoveCartItem,
  handleCheckout,
  handleCreateCheckoutOrder,
  handleVerifyCheckoutPayment,
  handleCreateBuyNowOrder,
  handleVerifyBuyNowPayment,
} = require("../controllers/product");
const { upload } = require("../upload");
const { ensureAuthenticated, ensureAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(ensureAuthenticated);

router.get("/", handleGetAllProducts);
router.get("/cart", handleGetCart);
router.post("/cart/:productId/update", handleUpdateCartQuantity);
router.post("/cart/:productId/remove", handleRemoveCartItem);
router.post("/cart/checkout", handleCheckout);
router.post("/cart/checkout/order", handleCreateCheckoutOrder);
router.post("/cart/checkout/verify", handleVerifyCheckoutPayment);
router.get("/:id", handleGetProductDetail);
router.post("/:id/cart", handleUpsertCartItem);
router.post("/:id/buy-now/order", handleCreateBuyNowOrder);
router.post("/:id/buy-now/verify", handleVerifyBuyNowPayment);
router.post("/:id/buy-now", handleBuyNow);


router.post("/", ensureAdmin, upload.single("image"), createNewProduct);
router.put("/:id", ensureAdmin, upload.single("image"), handleUpdateProductById);
router.delete("/:id", ensureAdmin, handleDeleteProductById);

module.exports = router;
