const express = require('express')
const router = express.Router();
const chatController = require('../controllers/chat')
const auth = require('../middleware/auth')

router
  .get('/:teacher_id', auth.decode, chatController.getChatById)
  .post('/:teacher_id', chatController.newChat)
  .post('/:teacher_id/message', chatController.newMessage)

module.exports = router;