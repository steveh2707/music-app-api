const express = require('express')
const router = express.Router();
const connection = require('../db')


router.post('/search', async (req, res) => {

  // await new Promise(resolve => setTimeout(resolve, 5000));

  console.log(req.body)

  let userLatitude = req.body.user_latitude
  let userLongitude = req.body.user_longitude
  let instrumentId = req.body.instrument_id
  let gradeRankId = req.body.grade_rank_id
  // let { userLatitude, userLongitude, instrumentId, gradeRankId } = req.body


  let searchTeachersSql = `
  SELECT teacher.teacher_id, first_name, last_name, tagline, bio, location_latitude, location_longitude, average_review_score, image_url, instrument_id, grade.name AS grade_teachable, rank,
	  111.111 *
      DEGREES(ACOS(LEAST(1.0, COS(RADIANS(location_latitude))
        * COS(RADIANS(?))
        * COS(RADIANS(location_longitude - ?))
        + SIN(RADIANS(location_latitude))
        * SIN(RADIANS(?))))) AS distance_in_km
	FROM teacher
    LEFT JOIN user on teacher.user_id=user.user_id
    LEFT JOIN image on teacher.image_id=image.image_id
    LEFT JOIN teacher_instrument_highest_grade_teachable on teacher.teacher_id=teacher_instrument_highest_grade_teachable.teacher_id
    LEFT JOIN grade on teacher_instrument_highest_grade_teachable.grade_id= grade.grade_id
    WHERE instrument_id = ? AND rank >= ?
  `

  connection.query(searchTeachersSql, [userLatitude, userLongitude, userLongitude, instrumentId, gradeRankId], (err, response) => {
    if (err) return res.json({ error: err })

    let json = {
      num_results: response.length,
      results: response
    }

    // console.log(json)

    res.status(200).json(json)
  })

})

module.exports = router;