const express = require('express')
const router = express.Router();
const bookingController = require('../controllers/booking')
const auth = require('../middleware/auth')

router
  .get('/availability/:teacher_id', bookingController.getTeacherAvailability) // get a teacher's availability
  .post('/', auth.decode, bookingController.makeBooking)

module.exports = router;