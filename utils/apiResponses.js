/**
 * Returns standard API error response
 * @param {String} message 
 * @param {Int} code 
 * @returns {Object} 
 */
const error = (message, code) => {
  console.log(message)

  return {
    success: false,
    message,
    code
  }
}

/**
 * Returns standard API success response
 * @param {String} message 
 * @param {Int} code 
 * @returns {Object} 
 */
const success = (message, code) => {
  return {
    success: true,
    message,
    code
  }
}

module.exports = { error, success }