const express = require('express')
const router = express.Router();
const imageController = require('../controllers/image')
const auth = require('../middleware/auth')
const multer = require('multer')




const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
// upload.single('avatar')

router
  .post('/', [auth.decode, upload.single('imageUploads')], imageController.newImage)


module.exports = router;