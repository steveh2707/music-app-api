const connection = require('../db')
const errorResponse = require('../apiError')

const getChatById = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  let userID = req.information.user_id
  // let teacherID = req.query.teacher_id
  let teacherID = req.params.teacher_id

  console.log(req.query)
  console.log(req.information)

  let sql = `
  SELECT @chat := chat_id AS chat_id, created_timestamp, teacher.teacher_id, teacher.user_id AS teacher_user_id, first_name AS teacher_first_name, last_name AS teacher_last_name, last_login_timestamp, profile_image_url 
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

    console.log(response)

    if (response[0].length === 0) return res.status(404).send(errorResponse("Chat does not exist", res.statusCode))

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

  let sql = `
  `
  connection.query(sql, [userID, teacherID], (err, response) => {

    res.status(200)
  })
}

const newMessage = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  let userID = req.information.user_id
  let teacherID = req.params.teacher_id

  let sql = `
  `
  connection.query(sql, [userID, teacherID], (err, response) => {

    res.status(200)
  })
}

module.exports = { getChatById, newChat, newMessage }