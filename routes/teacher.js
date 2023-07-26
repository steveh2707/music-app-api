const express = require('express')
const router = express.Router();
const teacherController = require('../controllers/teacher')
const auth = require('../middleware/auth')

router
  .get('/:teacher_id', teacherController.getTeacherById)
  .post('/search', teacherController.getTeachersSearch)
  .put('/', auth.decode, teacherController.updateTeacherDetails)

module.exports = router;