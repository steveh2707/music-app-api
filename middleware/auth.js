const jwt = require('jsonwebtoken')
const apiResponses = require('../utils/apiResponses')

const SECRET_KEY = process.env.JWT_SECRET_KEY

const decode = (req, res, next) => {

  if (!req.headers['authorization']) return res.status(401).send(apiResponses.error("User not logged in", res.statusCode))

  try {
    const token = req.headers.authorization
    const decoded = jwt.decode(token, SECRET_KEY)
    console.log(decoded)
    req.information = decoded
    return next()

  } catch (error) {
    return res.status(401).send(apiResponses.error("Invalid auth token", res.statusCode))
  }
}

module.exports = { decode }