const apiResponses = require('../utils/apiResponses')

const notFound = (req, res) => {
  res.status(404).send(apiResponses.error("Resource not found.", res.statusCode))
}

module.exports = notFound