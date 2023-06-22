const express = require('express')
const app = express()

// all routes
const userRouter = require('./routes/user')
const teacherRouter = require('./routes/teacher')
const configurationRouter = require('./routes/configuration')
const chatController = require('./routes/chat')

app.use(express.urlencoded({ extended: true }));
app.use(express.json())


app.use('/user', userRouter)
app.use('/teacher', teacherRouter)
app.use('/chat', chatController)
app.use('/configuration', configurationRouter)


app.listen((process.env.port || 4000), () => {
  console.log("API listening on port: 4000")
})