const express = require('express')
const router = express.Router();
const connection = require('../db')

router.post('/new_user', (req, res) => {

  // let body = JSON.parse(Object.keys(req.body)[0])

  let body = req.body

  console.log(body)

  res.status(201).send()
})

module.exports = router;