// import dependecies
const express = require('express')
const router = express.Router();
const userController = require('../controllers/user')
const auth = require('../middleware/auth')

// define all endpoints following '/user' and call controller functions
router
  .get('/review', auth.decode, userController.getUsersReviews) // get all users reviews
  .post('/login', userController.login) // check users details to allow them to log in
  .post('/', userController.newUser) // new user sign up
  .put('/', auth.decode, userController.updateUserDetails) // update user's details

// export router
module.exports = router;
