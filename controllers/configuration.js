const connection = require('../db')
const errorResponse = require('../apiError')

const getConfiguration = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  const getConfigurationSql = `
  SELECT * FROM instrument;
  SELECT * FROM grade;
  `

  connection.query(getConfigurationSql, (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    const instruments = response[0]
    const grades = response[1]

    res.status(200).send({ instruments, grades })
  })

}

module.exports = { getConfiguration }