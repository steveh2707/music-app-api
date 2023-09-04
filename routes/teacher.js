// import dependencies
const express = require('express')
const router = express.Router();
const teacherController = require('../controllers/teacher')
const auth = require('../middleware/auth')

// define all endpoints following '/teacher' and call controller functions
router
  .get('/favourite', auth.decode, teacherController.getFavouriteTeachers)

  .get('/availability', auth.decode, teacherController.getTeacherAvailability)
  .post('/availability', auth.decode, teacherController.newAvailabilitySlot)
  .put('/availability', auth.decode, teacherController.editAvailabilitySlot)
  .delete('/availability/:teacher_availability_id', auth.decode, teacherController.deleteAvailabilitySlot)

  .get('/:teacher_id', teacherController.getTeacherById)
  .get('/:teacher_id/review', teacherController.getTeacherReviews)
  .get('/:teacher_id/favourite', auth.decode, teacherController.isTeacherFavourited)
  .post('/:teacher_id/favourite', auth.decode, teacherController.favouriteTeacher)
  .delete('/:teacher_id/favourite', auth.decode, teacherController.unfavouriteTeacher)

  .post('/search', teacherController.getTeachersSearch)
  .post('/', auth.decode, teacherController.newTeacher)
  .put('/', auth.decode, teacherController.updateTeacherDetails)
  .post('/review', auth.decode, teacherController.newReview)

module.exports = router;