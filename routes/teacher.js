const express = require('express')
const router = express.Router();
const teacherController = require('../controllers/teacher')


router
  .get('/:teacher_id', teacherController.getTeacherById)
  .post('/search', teacherController.getTeachersSearch)

module.exports = router;