const express = require('express')
const app = express()

// import routes
const userRouter = require('./routes/user')
const teacherRouter = require('./routes/teacher')
const configurationRouter = require('./routes/configuration')
const chatRouter = require('./routes/chat')
const bookingRouter = require('./routes/booking')

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

// use routes
app.use('/user', userRouter)
app.use('/teacher', teacherRouter)
app.use('/chat', chatRouter)
app.use('/configuration', configurationRouter)
app.use('/booking', bookingRouter)


app.listen((process.env.port || 4000), () => {
  console.log("API listening on port: 4000")
})