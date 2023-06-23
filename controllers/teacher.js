const connection = require('../db')
const errorResponse = require('../apiError')

const getTeacherById = async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  // console.log("called")

  let teacherId = req.params.teacher_id

  let getTeacherSql = `
  SELECT user.user_id, @teacher := teacher_id AS teacher_id, first_name, last_name, tagline, bio, location_latitude, location_longitude, average_review_score, profile_image_url
    FROM user 
    LEFT JOIN teacher on user.user_id=teacher.user_id
    WHERE user.user_id=?;
  SELECT teacher_instrument_highest_grade_teachable.teacher_instrument_highest_grade_teachable_id AS id, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol, grade.grade_id, grade.name AS grade_name
    FROM teacher_instrument_highest_grade_teachable
    LEFT JOIN instrument on teacher_instrument_highest_grade_teachable.instrument_id=instrument.instrument_id
    LEFT JOIN grade on teacher_instrument_highest_grade_teachable.grade_id=grade.grade_id
    WHERE teacher_instrument_highest_grade_teachable.teacher_id = @teacher;
  SELECT review_id, num_stars, created_timestamp, details, user.user_id AS user_id, first_name, last_name, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol,grade.grade_id, grade.name AS grade_name
    FROM review
    LEFT JOIN user on review.user_id=user.user_id
    LEFT JOIN grade on review.grade_id=grade.grade_id
    LEFT JOIN instrument on review.instrument_id=instrument.instrument_id
    WHERE review.teacher_id=@teacher;
  `

  connection.query(getTeacherSql, [teacherId], (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

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

    // if (reviews.length > 0) {
    //   teacherDetails.average_review_score = totalReviewScore / reviews.length
    // } else {
    //   teacherDetails.average_review_score = 0
    // }


    res.status(200).send(teacherDetails)
  })
}


const getTeachersSearch = async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  // console.log(req.body)

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

  // console.log(sqlQuery)
  // console.log(sqlParams)

  connection.query(sqlQuery, sqlParams, (err, response) => {
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

    let json = {
      num_results: response.length,
      results: response
    }

    // console.log(json)

    res.status(200).send(json)
  })
}

module.exports = { getTeacherById, getTeachersSearch }