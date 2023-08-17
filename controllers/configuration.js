const connection = require('../models/db')
const apiResponses = require('../utils/apiResponses')

const getConfiguration = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 2000));

  const getConfigurationSql = `
  SELECT * FROM instrument;
  SELECT * FROM grade
  ORDER BY grade.rank;
  `

  connection.query(getConfigurationSql, (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const instruments = response[0]
    const grades = response[1]

    res.status(200).send({ instruments, grades })
  })

}

module.exports = { getConfiguration }