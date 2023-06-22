
const error = (message, code) => {
  return {
    success: false,
    message,
    code
  }
}

module.exports = error