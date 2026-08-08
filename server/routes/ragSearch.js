const express = require("express");
const router = express.Router();

const {
  searchResumeChunks
} = require("../controllers/ragSearchController");

router.post("/search", searchResumeChunks);

module.exports = router;