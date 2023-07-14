const express = require('express')
const router = express.Router();
const bookingController = require('../controllers/booking')
const auth = require('../middleware/auth')

router
  .get('/availability/:teacher_id', auth.decode, bookingController.getTeacherAvailability) // get a teacher's availability
  .get('/user_bookings', auth.decode, bookingController.getUsersBookings)
  .post('/', auth.decode, bookingController.makeBooking)
  .put('/cancel/:booking_id', auth.decode, bookingController.cancelBooking)

module.exports = router;