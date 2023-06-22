const connection = require('../db')

const getChatById = async (req, res) => {

  // await new Promise(resolve => setTimeout(resolve, 2000));

  let userID = req.query.user_id
  let teacherID = req.query.teacher_id

  console.log(req.query)

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
    if (err) return res.json({ error: "not working" })

    let chatDetails = response[0][0]
    let chatMessages = response[1]

    chatDetails.messages = []
    chatMessages.forEach(chat => {
      chatDetails.messages.push(chat)
    })

    res.status(200).json(chatDetails)
  })

}

module.exports = { getChatById }