const connection = require('../db')
const apiResponses = require('../utils/apiResponses')
const Date = require('../utils/Date')
const s3Utils = require('../utils/s3Utlis')

const getAllChats = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const userId = req.information.user_id
  const teacherId = req.information.teacher_id

  let sql = `
  SELECT C.chat_id AS chat_id, C.created_timestamp_utc, C.teacher_id, C.student_id,
  JSON_OBJECT('user_id', S.user_id, 'first_name', S.first_name, 'last_name', S.last_name, 's3_image_name', S.s3_image_name) AS student,
  JSON_OBJECT('user_id', TU.user_id, 'first_name', TU.first_name, 'last_name', TU.last_name, 's3_image_name', TU.s3_image_name) AS teacher,
  ( SELECT message
    FROM chat_message
    WHERE chat_message.chat_id = C.chat_id
    ORDER BY created_timestamp DESC
    LIMIT 1
  ) AS most_recent_message,
  ( SELECT COUNT(*)
    FROM chat_message
    WHERE chat_message.chat_id = C.chat_id AND sender_id != ? AND message_read=0
    ) AS unread_messages
  FROM chat C
  LEFT JOIN user S on C.student_id = S.user_id
  LEFT JOIN teacher T ON C.teacher_id = T.teacher_id
  LEFT JOIN user TU ON T.user_id = TU.user_id
  WHERE C.student_id = ? OR C.teacher_id = ?
  GROUP BY C.chat_id
  `

  connection.query(sql, [userId, userId, teacherId], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const chats = response
    for (let chat of chats) {
      chat.student = JSON.parse(chat.student)
      chat.teacher = JSON.parse(chat.teacher)

      try {
        chat.student.profile_image_url = await s3Utils.getSignedUrlLink(chat.student.s3_image_name)
      } catch {
        chat.student.profile_image_url = ""
      }
      try {
        chat.teacher.profile_image_url = await s3Utils.getSignedUrlLink(chat.teacher.s3_image_name)
      } catch {
        chat.teacher.profile_image_url = ""
      }
    }

    res.status(200).send({ results: response })
  })
}

const getChatId = (req, res) => {
  const userID = req.information.user_id
  const teacherID = req.query.teacher_id

  console.log(userID)
  console.log(teacherID)

  let sql = `
  SELECT * 
  FROM chat
  WHERE student_id = ? AND teacher_id = ?;
  `

  connection.query(sql, [userID, teacherID], (err, response) => {
    // if no chat exists, create chat 
    if (response.length === 0) return newChat(req, res)

    // if chat exists, append chat_id to req.params and run getChatById function
    req.params.chat_id = response[0].chat_id
    getChatById(req, res)
  })
}

const newChat = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  const userID = req.information.user_id
  const teacherID = req.query.teacher_id

  const sql = `
  INSERT INTO chat (chat_id, teacher_id, student_id, created_timestamp_utc) 
  VALUES (NULL, ?, ?, now()) 
  `
  connection.query(sql, [teacherID, userID], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    req.params.chat_id = response.insertId
    getChatById(req, res)
  })
}


const getChatById = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const userID = req.information.user_id
  const chatID = req.params.chat_id

  let sql = `
  SELECT @chat := C.chat_id AS chat_id, C.created_timestamp_utc, C.teacher_id, C.student_id,
  JSON_OBJECT('user_id', S.user_id, 'first_name', S.first_name, 'last_name', S.last_name, 's3_image_name', S.s3_image_name) AS student,
  JSON_OBJECT('user_id', TU.user_id, 'first_name', TU.first_name, 'last_name', TU.last_name, 's3_image_name', TU.s3_image_name) AS teacher
    FROM chat C
    LEFT JOIN user S on C.student_id = S.user_id
    LEFT JOIN teacher T on C.teacher_id = T.teacher_id
    LEFT JOIN user TU on T.user_id = TU.user_id
    WHERE C.chat_id = ?;
  SELECT chat_message_id, message, created_timestamp, sender_id
    FROM chat_message 
    WHERE chat_id = @chat
    ORDER BY created_timestamp;
  UPDATE chat_message
    SET message_read = 1
    WHERE sender_id != ? AND message_read = 0;
  `

  connection.query(sql, [chatID, userID], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    let chatDetails = response[0][0]
    const chatMessages = response[1]

    chatDetails.student = JSON.parse(chatDetails.student)
    chatDetails.teacher = JSON.parse(chatDetails.teacher)

    try {
      chatDetails.student.profile_image_url = await s3Utils.getSignedUrlLink(chatDetails.student.s3_image_name)
    } catch {
      chatDetails.student.profile_image_url = ""
    }
    try {
      chatDetails.teacher.profile_image_url = await s3Utils.getSignedUrlLink(chatDetails.teacher.s3_image_name)
    } catch {
      chatDetails.teacher.profile_image_url = ""
    }

    chatDetails.messages = []
    chatMessages.forEach(chat => {
      chatDetails.messages.push(chat)
    })

    res.status(200).send(chatDetails)
  })
}





const getUnreadCountTotal = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));
  console.log("req received")

  const userID = req.information.user_id
  // const teacherID = req.params.teacher_id

  let sql = `
  SELECT COUNT(*) as unread_messages
    FROM chat_message 
    LEFT JOIN chat ON chat_message.chat_id = chat.chat_id
    WHERE sender_id != ? AND message_read=0 AND (chat.teacher_id = ? OR chat.student_id = ?)
  `

  connection.query(sql, [userID, userID, userID], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

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
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const message = response[1][0]
    res.status(200).send(message)
  })
}


module.exports = { getAllChats, getChatId, getChatById, getUnreadCountTotal, newChat, newMessage }