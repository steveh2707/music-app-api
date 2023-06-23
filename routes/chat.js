const express = require('express')
const router = express.Router();
const chatController = require('../controllers/chat')
const auth = require('../middleware/auth')

router
  .get('/:teacher_id', auth.decode, chatController.getChatById) // gets chat between logged in user and teacher. Creates chat if it does not currently exist.
  .get('/', auth.decode, chatController.getAllChats) // gets all user's chats
  .post('/message/:chat_id', auth.decode, chatController.newMessage)

module.exports = router;