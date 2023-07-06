
const error = (message, code) => {

  console.log(message)

  return {
    success: false,
    message,
    code
  }
}

module.exports = error