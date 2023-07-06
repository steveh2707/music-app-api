const jwt = require('jsonwebtoken')
const errorResponse = require('../utils/apiError')

const SECRET_KEY = process.env.JWT_SECRET_KEY

const decode = (req, res, next) => {

  if (!req.headers['authorization']) return res.status(401).send(errorResponse("User not logged in", res.statusCode))

  try {
    const token = req.headers.authorization
    const decoded = jwt.decode(token, SECRET_KEY)
    req.information = decoded
    return next()

  } catch (error) {
    console.log(error)
    return res.status(401).send(errorResponse("Invalid auth token", res.statusCode))
  }
}

module.exports = { decode }