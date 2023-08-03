const express = require('express')
const router = express.Router();
const userController = require('../controllers/user')
const auth = require('../middleware/auth')

router
  .get('/review', auth.decode, userController.getUsersReviews)
  .post('/login', userController.login)
  .post('/', userController.newUser)
  .put('/', auth.decode, userController.updateUserDetails)


module.exports = router;