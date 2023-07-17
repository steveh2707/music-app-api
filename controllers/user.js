const connection = require('../db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const apiResponses = require('../utils/apiResponses')
const s3Utils = require('../utils/s3Utlis')

const SECRET_KEY = process.env.JWT_SECRET_KEY

const newUser = async (req, res) => {
  const body = req.body
  const firstName = body.first_name
  const lastName = body.last_name
  const email = body.email
  const passwordHash = await bcrypt.hash(body.password, 10)
  const dob = body.dob

  console.log(body)

  let createNewUserSql = `
  INSERT INTO user (user_id, first_name, last_name, email, password_hash, dob, registered_timestamp, last_login_timestamp, profile_image_url) 
  VALUES (NULL, ?, ?, ?, ?, ?, now(), now(), NULL) 
  `

  connection.query(createNewUserSql, [firstName, lastName, email, passwordHash, dob], async (err, response) => {
    // if error from mysql
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    login(req, res)
  })
}

// login function
const login = async (req, res) => {

  const email = req.body.email
  const password = req.body.password

  const loginSql = `
  SELECT user_id, first_name, last_name, email, password_hash, dob, registered_timestamp, profile_image_url, s3_image_name
    FROM user 
    WHERE email=?;
  `

  connection.query(loginSql, [email], async (err, response) => {
    // if error from mysql
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    // if user provided email address does not exist in database
    if (response.length == 0) return res.status(401).send(apiResponses.error("Email address does not exist", res.statusCode))

    // compare user provided password with password stored in database
    const comparison = await bcrypt.compare(password, response[0].password_hash)

    // if match does not exist between passwords
    if (!comparison) return res.status(401).send(apiResponses.error("Incorrect password", res.statusCode))

    // create token of user details
    const token = jwt.sign(JSON.stringify(response[0]), SECRET_KEY)

    // update last login time
    updateLastLoginTime(response[0].user_id)

    const { user_id, first_name, last_name, email, dob, registered_timestamp, s3_image_name } = response[0]
    let profile_image_url = response[0].profile_image_url

    if (profile_image_url == "" && s3_image_name != "") {
      profile_image_url = await s3Utils.getSignedUrlLink(s3_image_name)
    }

    let dataPacket = {
      token: token,
      details: { user_id, first_name, last_name, email, dob, registered_timestamp, profile_image_url }
    }

    // send successful response and attach token
    res.status(200).send(dataPacket)
  })
}


const updateLastLoginTime = (userId) => {

  let updateLastLoginSql = `
  UPDATE user SET last_login_timestamp = now() WHERE user.user_id = ? 
  `

  connection.query(updateLastLoginSql, [userId], async (err, response) => {
    if (err) return console.log(err)
  })
}



module.exports = { newUser, login }