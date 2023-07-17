const connection = require('../db')
const apiResponses = require('../utils/apiResponses')

const getTeacherById = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  // console.log("called")

  const teacherId = req.params.teacher_id

  const getTeacherSql = `
  SELECT user.user_id, @teacher := teacher_id AS teacher_id, first_name, last_name, tagline, bio, location_latitude, location_longitude, average_review_score, profile_image_url
    FROM user 
    LEFT JOIN teacher on user.user_id=teacher.user_id
    WHERE user.user_id=?;
  SELECT teacher_instrument_highest_grade_teachable.teacher_instrument_highest_grade_teachable_id AS id, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol, grades.grade_id, grades.name AS grade_name
    FROM teacher_instrument_highest_grade_teachable
    LEFT JOIN instrument on teacher_instrument_highest_grade_teachable.instrument_id=instrument.instrument_id
    LEFT JOIN grades on teacher_instrument_highest_grade_teachable.grade_id=grades.grade_id
    WHERE teacher_instrument_highest_grade_teachable.teacher_id = @teacher;
  SELECT review_id, num_stars, created_timestamp, details, user.user_id AS user_id, first_name, last_name, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol,grades.grade_id, grades.name AS grade_name
    FROM review
    LEFT JOIN user on review.user_id=user.user_id
    LEFT JOIN grades on review.grade_id=grades.grade_id
    LEFT JOIN instrument on review.instrument_id=instrument.instrument_id
    WHERE review.teacher_id=@teacher;
  `

  connection.query(getTeacherSql, [teacherId], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    let teacherDetails = response[0][0]
    const instrumentsTaught = response[1]
    const reviews = response[2]

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
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const frontEndPageNum = parseInt(req.query.page) || 1
  const mySQLPageNum = frontEndPageNum - 1;
  const resultsPerPage = 6;
  const pagestart = mySQLPageNum * resultsPerPage;

  const userLatitude = req.body.user_latitude
  const userLongitude = req.body.user_longitude
  const instrumentId = req.body.instrument_id
  const gradeRankId = req.body.grade_rank_id

  // base sql query
  let searchTeachersSql = `
  SELECT teacher.teacher_id, first_name, last_name, tagline, bio, location_latitude, location_longitude, average_review_score, profile_image_url, teacher_instrument_highest_grade_teachable_id AS id, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol AS instrument_sf_symbol, grades.name AS grade_teachable, rank`
  let sqlParams = []

  // check whether user has provided latitude and longitude
  if (userLatitude && userLongitude) {
    searchTeachersSql += `
    , 111.111 *
        DEGREES(ACOS(LEAST(1.0, COS(RADIANS(location_latitude))
          * COS(RADIANS(?))
          * COS(RADIANS(location_longitude - ?))
          + SIN(RADIANS(location_latitude))
          * SIN(RADIANS(?))))) AS distance_in_km`
    sqlParams.push(userLatitude, userLongitude, userLatitude)
  }

  // add middle section of sql query
  searchTeachersSql += `
  FROM teacher
    LEFT JOIN user on teacher.user_id=user.user_id
    LEFT JOIN teacher_instrument_highest_grade_teachable on teacher.teacher_id=teacher_instrument_highest_grade_teachable.teacher_id
    LEFT JOIN grades on teacher_instrument_highest_grade_teachable.grade_id= grades.grade_id
    LEFT JOIN instrument on teacher_instrument_highest_grade_teachable.instrument_id=instrument.instrument_id
  `

  // build extra params required for WHERE clauses on count query
  let sqlParamsForCount = []

  // check whether user has provided an instrument id
  if (instrumentId) {
    searchTeachersSql += 'WHERE instrument.instrument_id = ?';
    sqlParams.push(instrumentId);
    sqlParamsForCount.push(instrumentId);
  }

  // check whether user has provided a grade id
  if (gradeRankId) {
    if (instrumentId) {
      searchTeachersSql += ' AND rank >= ?';
    } else {
      searchTeachersSql += 'WHERE rank >= ?';
    }
    sqlParams.push(gradeRankId);
    sqlParamsForCount.push(gradeRankId);
  }

  // create count query by replacing SELECT query with a count
  const countSql = `
  SELECT COUNT(*) AS count FROM
  ` + searchTeachersSql.split("FROM")[1]

  // add limit for pagination on search teachers result
  searchTeachersSql += `
    LIMIT ?, ?;
  `
  sqlParams.push(pagestart, resultsPerPage)

  // combine both queries, including the extra params needed for the WHERE clauses on the count query
  searchTeachersSql += countSql
  sqlParams.push(...sqlParamsForCount)


  connection.query(searchTeachersSql, sqlParams, (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const numResults = response[1][0].count
    const totalPages = Math.ceil(numResults / resultsPerPage)

    let json = {
      num_results: numResults,
      page: frontEndPageNum,
      total_pages: totalPages,
      results: response[0]
    }

    res.status(200).send(json)
  })
}

module.exports = { getTeacherById, getTeachersSearch }