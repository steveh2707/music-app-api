const express = require('express')
const router = express.Router();
const bookingController = require('../controllers/booking')
const auth = require('../middleware/auth')

router
  .get('/', auth.decode, bookingController.getBookings)
  .post('/', auth.decode, bookingController.makeBooking)
  .get('/availability/:teacher_id', auth.decode, bookingController.getTeacherAvailability) // get a teacher's availability
  .put('/:booking_id', auth.decode, bookingController.cancelBooking)
module.exports = router;