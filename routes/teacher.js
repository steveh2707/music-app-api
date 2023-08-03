const express = require('express')
const router = express.Router();
const teacherController = require('../controllers/teacher')
const auth = require('../middleware/auth')

router
  .get('/:teacher_id', teacherController.getTeacherById)
  .get('/:teacher_id/review', teacherController.getTeacherReviews)

  .post('/search', teacherController.getTeachersSearch)
  .put('/', auth.decode, teacherController.updateTeacherDetails)
  .post('/review', auth.decode, teacherController.newReview)

module.exports = router;