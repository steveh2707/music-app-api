const express = require('express')
const router = express.Router();
const connection = require('../db')
const bcrypt = require('bcrypt')

router.post('/new_user', async (req, res) => {

  // let body = JSON.parse(Object.keys(req.body)[0])

  let body = req.body
  console.log(body)


  const hashedPassword = await bcrypt.hash(body.password, 10)
  console.log(hashedPassword)


  await new Promise(resolve => setTimeout(resolve, 1000));

  res.status(409).send()
})

router.post('/login', async (req, res) => {

  let body = req.body

  console.log(body)

  await new Promise(resolve => setTimeout(resolve, 1000));

  res.status(201).send()
})

module.exports = router;