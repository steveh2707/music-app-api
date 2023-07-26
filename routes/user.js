const express = require('express')
const router = express.Router();
const userController = require('../controllers/user')
const auth = require('../middleware/auth')

router
  .post('/login', userController.login)
  .post('/', userController.newUser)
  .put('/', auth.decode, userController.updateUserDetails)


module.exports = router;