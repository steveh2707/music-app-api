const express = require('express')
const router = express.Router();
const chatController = require('../controllers/chat')
const auth = require('../middleware/auth')

router
  .get('/conversation', auth.decode, chatController.getAllChats) // get all user's chats
  .get('/conversation/:teacher_id', auth.decode, chatController.getChatById) // get chat between logged in user and teacher. Creates chat if it does not currently exist.

  .get('/unread', auth.decode, chatController.getUnreadCountTotal) // get unread messages from all users chats
  // .get('/unread/:chat_id', auth.decode, chatController.getUnreadCountChat) // get unread messages from single chat

  .post('/message/:chat_id', auth.decode, chatController.newMessage)

module.exports = router;