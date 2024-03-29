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
const notFound = require('./controllers/notFound')

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

// catch any other routes
app.use(notFound)

// set up API
app.listen((process.env.port || 4000), () => {
  console.log(`API listening on port: ${(process.env.port || 4000)}`)
})

module.exports = app
