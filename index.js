// import packages
const express = require('express')
const app = express()
const cors = require('cors')

// import routes
const userRouter = require('./routes/user')
const teacherRouter = require('./routes/teacher')
const configurationRouter = require('./routes/configuration')
const chatRouter = require('./routes/chat')
const bookingRouter = require('./routes/booking')
const imageRouter = require('./routes/image')

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(cors())

// use routes
app.use('/user', userRouter)
app.use('/teacher', teacherRouter)
app.use('/chat', chatRouter)
app.use('/configuration', configurationRouter)
app.use('/booking', bookingRouter)
app.use('/image', imageRouter)

// set up API
app.listen((process.env.port || 4000), () => {
  console.log("API listening on port: 4000")
})

