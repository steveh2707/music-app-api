const connection = require('../db')
const apiResponses = require('../utils/apiResponses')
const s3Utils = require('../utils/s3Utlis')
require('dotenv').config()

const newImage = async (req, res) => {

  console.log(req.file)

  s3Utils.saveToS3(req.file)

  const userId = req.information.user_id
  const originalName = req.file.originalname

  let sql = `
  SELECT s3_image_name 
    FROM user WHERE user_id = ?;
  UPDATE user 
    SET s3_image_name = ? WHERE user.user_id = ? 
  `

  connection.query(sql, [userId, originalName, userId], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    if (response[1].affectedRows == 0) return res.status(400).send(apiResponses.error("Database not updated", res.statusCode))

    profile_image_url = await s3Utils.getSignedUrlLink(originalName)

    const oldImageName = response[0][0].s3_image_name

    await s3Utils.deleteFromS3(oldImageName)

    res.status(200).send({ profile_image_url })
  })

}



module.exports = { newImage }