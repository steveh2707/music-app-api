const express = require('express')
const router = express.Router();
const chatController = require('../controllers/chat')
const auth = require('../middleware/auth')

router
  .get('/conversation', auth.decode, chatController.getAllChats) // gets all user's chats
  .get('/conversation/:teacher_id', auth.decode, chatController.getChatById) // gets chat between logged in user and teacher. Creates chat if it does not currently exist.

  .get('/unread', auth.decode, chatController.getUnreadCount) // gets all user's chats
  .get('/unread/:teacher_id', auth.decode, chatController.getUnreadCount) // gets all user's chats

  .post('/message/:chat_id', auth.decode, chatController.newMessage)

module.exports = router;