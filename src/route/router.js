const express = require("express");
const router = express.Router();
const urlController = require('../controller/urlController')


router.post("/url/shortUrl", urlController.urlShortner)
router.get("/:urlCode", urlController.urlRedirect)



module.exports = router;