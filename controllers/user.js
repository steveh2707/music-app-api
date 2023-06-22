const connection = require('../db')
// const bcrypt = require('bcrypt')

const newUser = async (req, res) => {
  let body = req.body
  console.log(body)

  // const hashedPassword = await bcrypt.hash(body.password, 10)
  // console.log(hashedPassword)

  await new Promise(resolve => setTimeout(resolve, 1000));

  res.status(409).send()
}

const login = async (req, res) => {
  let body = req.body
  console.log(body)

  // perform some db operations to check if the user information is
  // correct or not.
  const payload = {
    username: req.body.username,
    password: req.body.password
  }

  // const token = jwt.sign(payload, SECRET_KEY)
  // req.token = token

  await new Promise(resolve => setTimeout(resolve, 1000));

  res.status(201).send()
}

module.exports = { newUser, login }