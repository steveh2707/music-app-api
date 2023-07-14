const express = require('express')
const router = express.Router();
const userController = require('../controllers/user')
const auth = require('../middleware/auth')

router
  .post('/login', userController.login)
  .post('/', userController.newUser)
// .get('/', auth.decode, userController.getUserDetails)

module.exports = router;