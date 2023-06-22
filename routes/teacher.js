const express = require('express')
const router = express.Router();
const teacherController = require('../controllers/teacher')

router
  .get('/:teacherId', teacherController.getTeacherById)
  .post('/search', teacherController.getTeachersSearch)

module.exports = router;