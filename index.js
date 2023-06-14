const express = require('express')
const app = express()
var bodyParser = require('body-parser');

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(require('./routes/teacher'))
app.use(require('./routes/user'))

app.listen((process.env.port || 4000), () => {
  console.log("API listening on port: 4000")
})