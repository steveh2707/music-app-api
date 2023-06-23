const connection = require('../db')
const errorResponse = require('../apiError')

const getAllChats = async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  let userId = req.information.user_id

  console.log(userId)

  let sql = `
  SELECT chat_id, created_timestamp_utc, teacher.teacher_id, first_name, last_name, profile_image_url 
	  FROM chat 
    LEFT JOIN teacher ON chat.teacher_id = teacher.teacher_id
    LEFT JOIN user ON teacher.user_id = user.user_id
	  WHERE chat.user_id = ?;
  `

  connection.query(sql, [userId], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    let allChats = response

    res.status(200).send({ results: allChats })
  })
}

// const getMostRecentMessage = async (chatId) => {

//   let sql = `
//   SELECT chat_message_id, message, created_timestamp, sender_id, first_name
//     FROM chat_message
//     LEFT JOIN user ON chat_message.sender_id=user.user_id
//     WHERE chat_id=1
//     ORDER BY created_timestamp DESC
//     LIMIT 1
//   `

//   connection.query(sql, [chatId], (err, response) => {
//     if (err) return res.status(400).send(errorResponse(err, res.statusCode))

//     return response
//   })
// }

const getChatById = async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  let userID = req.information.user_id
  let teacherID = req.params.teacher_id

  let sql = `
  SELECT @chat := chat_id AS chat_id, created_timestamp_utc, teacher.teacher_id, teacher.user_id AS teacher_user_id, first_name AS teacher_first_name, last_name AS teacher_last_name, last_login_timestamp, profile_image_url 
    FROM chat
    LEFT JOIN teacher ON chat.teacher_id=teacher.teacher_id
    LEFT JOIN user on teacher.user_id=user.user_id
    WHERE chat.user_id = ? AND chat.teacher_id = ?;
  SELECT chat_message_id, message, created_timestamp, sender_id
    FROM chat_message 
    WHERE chat_id = @chat
    ORDER BY created_timestamp;
  `

  connection.query(sql, [userID, teacherID], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    if (response[0].length === 0) return newChat(req, res)

    let chatDetails = response[0][0]
    let chatMessages = response[1]

    chatDetails.messages = []
    chatMessages.forEach(chat => {
      chatDetails.messages.push(chat)
    })

    res.status(200).send(chatDetails)
  })
}

const newChat = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  let userID = req.information.user_id
  let teacherID = req.params.teacher_id
  let dateTime = new Date().toISOString().slice(0, 19).replace('T', ' '); // get current datetime (UTC) and convert to mysql datetime format

  let sql = `
  INSERT INTO chat (chat_id, teacher_id, user_id, created_timestamp_utc) 
  VALUES (NULL, ?, ?, ?) 
  `
  connection.query(sql, [teacherID, userID, dateTime], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    getChatById(req, res)
  })
}

const newMessage = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  let chatID = req.params.chat_id
  let userID = req.information.user_id
  let message = req.body.message
  let dateTime = new Date().toISOString().slice(0, 19).replace('T', ' '); // get current datetime (UTC) and convert to mysql datetime format


  console.log(userID)
  console.log(chatID)
  console.log(message)

  let sql = `
  INSERT INTO chat_message (chat_message_id, message, created_timestamp, sender_id, chat_id) 
    VALUES (NULL, ?, ?, ?, ?);
  SELECT chat_message_id, message, created_timestamp, sender_id
    FROM chat_message 
    WHERE chat_message_id = LAST_INSERT_ID()
  `

  connection.query(sql, [message, dateTime, userID, chatID], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    let message = response[1][0]
    res.status(200).send(message)
  })
}

module.exports = { getAllChats, getChatById, newChat, newMessage }