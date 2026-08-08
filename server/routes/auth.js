const express = require("express");
const router = express.Router();

const {
  register,
  login,
  googleAuth,
  getSession,
  oauthExchange,
  refreshGoogleToken
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");


router.post("/register", register);

router.post("/login", login);

router.post("/google", googleAuth);
router.post('/oauth', oauthExchange);

router.get("/session", authMiddleware, getSession);
router.post("/refresh-google-token", authMiddleware, refreshGoogleToken);


module.exports = router;