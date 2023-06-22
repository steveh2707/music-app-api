const express = require('express')
const router = express.Router();
const userController = require('../controllers/user')

router
  .post('/login', userController.login)
  .post('/', userController.newUser)

module.exports = router;