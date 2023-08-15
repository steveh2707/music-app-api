const express = require('express')
const router = express.Router();
const teacherController = require('../controllers/teacher')
const auth = require('../middleware/auth')

router
  .get('/favourite', auth.decode, teacherController.getFavouriteTeachers)
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