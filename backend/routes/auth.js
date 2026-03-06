const express = require("express");
const router = express.Router();

const {
  register,
  login,
  googleAuth,
  getSession,
  oauthExchange
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");


router.post("/register", register);

router.post("/login", login);

router.post("/google", googleAuth);
router.post('/oauth', oauthExchange);

router.get("/session", authMiddleware, getSession);


module.exports = router;