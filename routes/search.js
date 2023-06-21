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

  let searchTeachersBaseStartSql = `
  SELECT teacher.teacher_id, first_name, last_name, tagline, bio, location_latitude, location_longitude, average_review_score, profile_image_url, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol AS instrument_sf_symbol, grade.name AS grade_teachable, rank
  `

  let searchTeachersMiddleSql = `
  ,
	  111.111 *
      DEGREES(ACOS(LEAST(1.0, COS(RADIANS(location_latitude))
        * COS(RADIANS(?))
        * COS(RADIANS(location_longitude - ?))
        + SIN(RADIANS(location_latitude))
        * SIN(RADIANS(?))))) AS distance_in_km
  `

  let searchTeachersBaseEndSql = `
  FROM teacher
    LEFT JOIN user on teacher.user_id=user.user_id
    LEFT JOIN teacher_instrument_highest_grade_teachable on teacher.teacher_id=teacher_instrument_highest_grade_teachable.teacher_id
    LEFT JOIN grade on teacher_instrument_highest_grade_teachable.grade_id= grade.grade_id
    LEFT JOIN instrument on teacher_instrument_highest_grade_teachable.instrument_id=instrument.instrument_id
  `

  let sqlQuery = ''
  let sqlParams = []

  if (userLatitude && userLongitude) {
    sqlQuery = searchTeachersBaseStartSql + searchTeachersMiddleSql + searchTeachersBaseEndSql
    sqlParams.push(userLatitude, userLongitude, userLatitude)
  } else {
    sqlQuery = searchTeachersBaseStartSql + searchTeachersBaseEndSql
  }

  if (instrumentId && gradeRankId) {
    sqlQuery += 'WHERE instrument.instrument_id = ? AND rank >= ?'
    sqlParams.push(instrumentId, gradeRankId)
  } else if (instrumentId) {
    sqlQuery += 'WHERE instrument.instrument_id = ?'
    sqlParams.push(instrumentId)
  } else if (gradeRankId) {
    sqlQuery += 'WHERE rank >= ?'
    sqlParams.push(gradeRankId)
  }

  console.log(sqlQuery)
  console.log(sqlParams)

  connection.query(sqlQuery, sqlParams, (err, response) => {
    if (err) return res.json({ error: err })

    let json = {
      num_results: response.length,
      results: response
    }

    console.log(json)

    res.status(200).json(json)
  })

})

module.exports = router;