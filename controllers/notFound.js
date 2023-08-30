// import dependencies
const apiResponses = require('../utils/apiResponses')

/**
 * Standardised response for any API endpoint that has not been defined.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const notFound = (req, res) => {
  res.status(404).send(apiResponses.error("Resource not found.", res.statusCode))
}

module.exports = notFound