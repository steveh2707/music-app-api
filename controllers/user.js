const connection = require('../db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const errorResponse = require('../apiError')

const SECRET_KEY = process.env.MAMP_PASSWORD

const newUser = async (req, res) => {
  let body = req.body
  console.log(body)

  const hashedPassword = await bcrypt.hash(body.password, 10)
  console.log(hashedPassword)

  await new Promise(resolve => setTimeout(resolve, 1000));

  res.status(409).send()
}

// login function
const login = async (req, res) => {

  const email = req.body.email
  const password = req.body.password

  let loginSql = `
  SELECT user_id, first_name, last_name, email, password_hash, dob, registered_timestamp, profile_image_url
    FROM user 
    WHERE email=?
  `

  connection.query(loginSql, [email], async (err, response) => {
    // if error from mysql
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    // if user provided email address does not exist in database
    if (response.length == 0) return res.status(401).send(errorResponse("Email address does not exist", res.statusCode))

    // compare user provided password with password stored in database
    const comparison = await bcrypt.compare(password, response[0].password_hash)

    // if match does not exist between passwords
    if (!comparison) return res.status(401).send(errorResponse("Incorrect password", res.statusCode))

    // create token of user details
    const token = jwt.sign(JSON.stringify(response[0]), SECRET_KEY)

    // await new Promise(resolve => setTimeout(resolve, 1000));

    // send successful response and attach token
    res.status(200).send({ token })

  })

}

module.exports = { newUser, login }