// import dependencies
const express = require('express')
const router = express.Router();
const imageController = require('../controllers/image')
const auth = require('../middleware/auth')
const multer = require('multer')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

// define all endpoints following '/image' and call controller functions
router
  .post('/', [auth.decode, upload.single('imageUploads')], imageController.newImage)

module.exports = router;