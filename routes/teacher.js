const express = require('express')
const router = express.Router();
const connection = require('../db')


router.get('/teacher/:teacherId', async (req, res) => {

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("connection made")

  let teacherId = req.params.teacherId

  let getTeacherSql = `
  SELECT user.user_id, @teacher := teacher_id AS teacher_id, first_name, last_name, bio, location_latitude, location_longitude, image_url
    FROM user 
    LEFT JOIN teacher on user.user_id=teacher.user_id
    LEFT JOIN image on teacher.image_id=image.image_id
    WHERE user.user_id=?;
  SELECT instrument.instrument_id, instrument.name AS instrument_name, grade.grade_id, grade.name AS grade_name
    FROM teacher_instrument_highest_grade_teachable
    LEFT JOIN instrument on teacher_instrument_highest_grade_teachable.instrument_id=instrument.instrument_id
    LEFT JOIN grade on teacher_instrument_highest_grade_teachable.grade_id=grade.grade_id
    WHERE teacher_instrument_highest_grade_teachable.teacher_id = @teacher;
  SELECT review_id, num_stars, created_timestamp, details, student.student_id AS student_id, first_name, last_name, instrument.instrument_id, instrument.name AS instrument_name, grade.grade_id, grade.name AS grade_name
  	FROM review
    LEFT JOIN student on review.student_id=student.student_id
    LEFT JOIN user on student.user_id=user.user_id
    LEFT JOIN grade on review.grade_id=grade.grade_id
    LEFT JOIN instrument on review.instrument_id=instrument.instrument_id
    WHERE review.teacher_id=@teacher;
  `

  connection.query(getTeacherSql, [teacherId], (err, response) => {
    if (err) return res.json({ error: "not working" })

    let teacherDetails = response[0][0]
    let instrumentsTaught = response[1]
    let reviews = response[2]

    teacherDetails.instruments_taught = []
    instrumentsTaught.forEach(instrument => {
      teacherDetails.instruments_taught.push(instrument)
    })

    let totalReviewScore = 0

    teacherDetails.reviews = []
    reviews.forEach(review => {
      teacherDetails.reviews.push(review)
      totalReviewScore += review.num_stars
    })

    if (reviews.length > 0) {
      teacherDetails.average_review_score = totalReviewScore / reviews.length
    } else {
      teacherDetails.average_review_score = 0
    }


    res.status(200).json(teacherDetails)
  })

})

module.exports = router;