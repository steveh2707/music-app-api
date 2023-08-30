// import dependencies
const jwt = require('jsonwebtoken')
const apiResponses = require('../utils/apiResponses')
const SECRET_KEY = process.env.JWT_SECRET_KEY

/**
 * decode authorization header and attach decoded data to request
 * @param {Object} req The request object
 * @param {Object} res The response object
 * @param {Function} next Function to execute next middleware function
 */
const decode = (req, res, next) => {
  // if authorization header doesn't exist return 401 error
  if (!req.headers['authorization']) return res.status(401).send(apiResponses.error("User not logged in", res.statusCode))

  // try to decode information and attach to request. Return 401 error if cannot be decoded.
  try {
    const token = req.headers.authorization
    const decoded = jwt.decode(token, SECRET_KEY)
    req.information = decoded
    return next()

  } catch (error) {
    return res.status(401).send(apiResponses.error("Invalid auth token", res.statusCode))
  }
}

module.exports = { decode }

