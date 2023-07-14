
const error = (message, code) => {
  console.log(message)

  return {
    success: false,
    message,
    code
  }
}

const success = (message, code) => {

  return {
    success: true,
    message,
    code
  }
}

module.exports = { error, success }