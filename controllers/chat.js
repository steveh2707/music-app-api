const connection = require('../db')
const errorResponse = require('../apiError')
const Date = require('../utils/Date')

const getAllChats = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const userId = req.information.user_id

  // console.log(userId)

  const sql = `
  SELECT chat_id, created_timestamp_utc, teacher.teacher_id, first_name, last_name, profile_image_url 
	  FROM chat 
    LEFT JOIN teacher ON chat.teacher_id = teacher.teacher_id
    LEFT JOIN user ON teacher.user_id = user.user_id
	  WHERE chat.user_id = ?;
  `

  connection.query(sql, [userId], async (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    let allChats = response

    appendExtraChatDetails(allChats, 0, res, userId)

    // res.status(200).send({ results: allChats })
  })
}

const appendExtraChatDetails = (allChats, index, res, userId) => {

  if (index > allChats.length - 1) return res.status(200).send({ results: allChats })

  const sql = `
  SELECT message, chat_id, created_timestamp
	  FROM chat_message 
    WHERE chat_id = ?
    ORDER BY created_timestamp DESC
    LIMIT 1;
  SELECT COUNT(*) as unread
    FROM chat_message 
    WHERE sender_id != ? AND message_read=0;
  `

  connection.query(sql, [allChats[index].chat_id, userId], async (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    allChats[index].most_recent_message = response[0].length > 0 ? response[0][0].message : ""
    allChats[index].unread_messages = response[1][0].unread

    index++

    appendExtraChatDetails(allChats, index, res, userId)
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
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const userID = req.information.user_id
  const teacherID = req.params.teacher_id
  console.log(userID)
  console.log(teacherID)

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
  UPDATE chat_message
    SET message_read = 1
    WHERE message_read = 0;
  `

  connection.query(sql, [userID, teacherID], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    if (response[0].length === 0) return newChat(req, res)

    let chatDetails = response[0][0]
    const chatMessages = response[1]

    chatDetails.messages = []
    chatMessages.forEach(chat => {
      chatDetails.messages.push(chat)
    })

    res.status(200).send(chatDetails)
  })
}


const newChat = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  const userID = req.information.user_id
  const teacherID = req.params.teacher_id

  const sql = `
  INSERT INTO chat (chat_id, teacher_id, user_id, created_timestamp_utc) 
  VALUES (NULL, ?, ?, now()) 
  `
  connection.query(sql, [teacherID, userID], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    getChatById(req, res)
  })
}


const getUnreadCountTotal = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const userID = req.information.user_id
  const teacherID = req.params.teacher_id

  let sql = `
  SELECT COUNT(*) as unread_messages
    FROM chat_message 
    WHERE sender_id != ? AND message_read=0
  `

  connection.query(sql, [userID], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    res.status(200).send(response[0])
  })
}

const getUnreadCountChat = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("req received")

  const chatId = req.params.chat_id
  const userID = req.information.user_id

  let sql = `
  SELECT COUNT(*) as unread_messages
    FROM chat_message 
    WHERE chat_id = ? AND sender_id != ? AND message_read=0
  `

  connection.query(sql, [chatId, userID], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    res.status(200).send(response[0])
  })
}



const newMessage = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  const chatID = req.params.chat_id
  const userID = req.information.user_id
  const message = req.body.message
  const dateTime = new Date().toISOString().slice(0, 19).replace('T', ' '); // get current datetime (UTC) and convert to mysql datetime format

  const sql = `
  INSERT INTO chat_message (chat_message_id, message, created_timestamp, sender_id, chat_id) 
    VALUES (NULL, ?, ?, ?, ?);
  SELECT chat_message_id, message, created_timestamp, sender_id
    FROM chat_message 
    WHERE chat_message_id = LAST_INSERT_ID()
  `

  connection.query(sql, [message, dateTime, userID, chatID], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    const message = response[1][0]
    res.status(200).send(message)
  })
}

module.exports = { getAllChats, getChatById, getUnreadCountTotal, getUnreadCountChat, newChat, newMessage }