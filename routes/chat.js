// import dependencies
const express = require('express')
const router = express.Router();
const chatController = require('../controllers/chat')
const auth = require('../middleware/auth')

router
  .get('/', auth.decode, chatController.getAllChats) // get all user's chats
  .get('/conversation', auth.decode, chatController.getChatId) // get chat id from student_id and teacher_id, if chat doesn' exist, create a new one
  .get('/conversation/:chat_id', auth.decode, chatController.getChatById) // get chat chat_id
  .get('/unread', auth.decode, chatController.getUnreadCountTotal) // get unread messages from all users chats
  .post('/message/:chat_id', auth.decode, chatController.newMessage) // post message to database

module.exports = router;

