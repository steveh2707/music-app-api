const connection = require('../db')
const apiResponses = require('../utils/apiResponses')
const s3Utils = require('../utils/s3Utlis')

const getTeacherById = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const teacherId = req.params.teacher_id

  const getTeacherSql = `
  SELECT user.user_id, @teacher := teacher_id AS teacher_id, first_name, last_name, tagline, bio, location_title, location_latitude, location_longitude, average_review_score, s3_image_name
    FROM user 
    LEFT JOIN teacher on user.user_id=teacher.user_id
    WHERE user.user_id=?;
  SELECT teacher_instrument_taught.teacher_instrument_taught_id AS id, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol, grade.grade_id, grade.name AS grade_name
    FROM teacher_instrument_taught
    LEFT JOIN instrument on teacher_instrument_taught.instrument_id=instrument.instrument_id
    LEFT JOIN grade on teacher_instrument_taught.grade_id=grade.grade_id
    WHERE teacher_instrument_taught.teacher_id = @teacher;
  SELECT review_id, num_stars, created_timestamp, details, user.user_id AS user_id, first_name, last_name, s3_image_name, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol,grade.grade_id, grade.name AS grade_name
    FROM review
    LEFT JOIN user on review.user_id=user.user_id
    LEFT JOIN grade on review.grade_id=grade.grade_id
    LEFT JOIN instrument on review.instrument_id=instrument.instrument_id
    WHERE review.teacher_id=@teacher
    ORDER BY created_timestamp DESC
    LIMIT 5;
  `

  connection.query(getTeacherSql, [teacherId], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    let teacherDetails = response[0][0]
    const instrumentsTaught = response[1]
    const reviews = response[2]

    try {
      teacherDetails.profile_image_url = await s3Utils.getSignedUrlLink(teacherDetails.s3_image_name)
    } catch {
      teacherDetails.profile_image_url = ""
    }

    teacherDetails.instruments_taught = []
    instrumentsTaught.forEach(instrument => {
      teacherDetails.instruments_taught.push(instrument)
    })

    teacherDetails.reviews = []
    for (let review of reviews) {
      try {
        review.profile_image_url = await s3Utils.getSignedUrlLink(review.s3_image_name)
      } catch {
        review.profile_image_url = ""
      }
      teacherDetails.reviews.push(review)
    }

    res.status(200).send(teacherDetails)
  })
}

const isTeacherFavourited = (req, res) => {
  const userId = req.information.user_id
  const teacherId = req.params.teacher_id

  let sql = `
  SELECT COUNT(*) as count FROM favourite WHERE teacher_id = ? AND user_id = ?
  `

  connection.query(sql, [teacherId, userId], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    // console.log(response)
    res.status(200).send(response[0])
  })
}

const favouriteTeacher = (req, res) => {
  const userId = req.information.user_id
  const teacherId = req.params.teacher_id

  let sql = `
  INSERT INTO favourite (favourite_id, created_timestamp, user_id, teacher_id) VALUES (NULL, CURRENT_TIMESTAMP, ?, ?) 
  `

  connection.query(sql, [userId, teacherId], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    if (response.affectedRows == 0) return res.status(400).send(apiResponses.error(err, res.statusCode))

    res.status(200).send(apiResponses.success("Teacher favourited", res.statusCode))
  })
}

const unfavouriteTeacher = (req, res) => {
  const userId = req.information.user_id
  const teacherId = req.params.teacher_id

  let sql = `
  DELETE FROM favourite WHERE favourite.user_id = ? AND favourite.teacher_id = ? 
  `

  connection.query(sql, [userId, teacherId], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    if (response.affectedRows == 0) return res.status(400).send(apiResponses.error(err, res.statusCode))

    res.status(200).send(apiResponses.success("Teacher favourited", res.statusCode))
  })
}

const getTeachersSearch = async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  // console.log(req.body)

  const frontEndPageNum = parseInt(req.query.page) || 1
  const mySQLPageNum = frontEndPageNum - 1;
  const resultsPerPage = 6;
  const pagestart = mySQLPageNum * resultsPerPage;

  const userLatitude = req.body.user_latitude
  const userLongitude = req.body.user_longitude
  const instrumentId = req.body.instrument_id || "11"
  const gradeRankId = req.body.grade_rank_id || "0"
  const sort = req.body.selected_sort

  let sqlParams = [instrumentId, gradeRankId]

  // if location information is provided
  let locationAddon = ""
  if (userLatitude && userLongitude) {
    locationAddon = `
    , 111.111 *
        DEGREES(ACOS(LEAST(1.0, COS(RADIANS(location_latitude))
          * COS(RADIANS(?))
          * COS(RADIANS(location_longitude - ?))
          + SIN(RADIANS(location_latitude))
          * SIN(RADIANS(?))))) AS distance_in_km`
    sqlParams.push(userLatitude, userLongitude, userLatitude)
  }

  sqlParams.push(pagestart, resultsPerPage)

  let searchTeachersSql = `
  SET @instrument := ?;
  SET @rank := ?;
  SELECT 
    t.teacher_id, 
    first_name, 
    last_name, 
    tagline, 
    bio, 
    location_title, 
    location_latitude, 
    location_longitude, 
    average_review_score, 
    s3_image_name, 
    teacher_instrument_taught_id, 
    i.instrument_id, 
    i.name AS instrument_name, 
    sf_symbol AS instrument_sf_symbol, 
    g.name AS grade_teachable, 
    rank,
    c.base_cost,
    (SELECT COUNT(*) FROM teacher AS t2
      LEFT JOIN teacher_instrument_taught AS ti2 ON t2.teacher_id = ti2.teacher_id
      LEFT JOIN instrument AS i2 ON ti2.instrument_id = i2.instrument_id
      WHERE i2.instrument_id = @instrument AND rank >= @rank) AS total_results
    ${locationAddon}
  FROM teacher AS t
  LEFT JOIN user ON t.user_id = user.user_id
  LEFT JOIN teacher_instrument_taught AS ti ON t.teacher_id = ti.teacher_id
  LEFT JOIN grade AS g ON ti.grade_id = g.grade_id
  LEFT JOIN instrument AS i ON ti.instrument_id = i.instrument_id
  LEFT JOIN (
    SELECT teacher_id, base_cost, max_grade_id, instrument_id 
    FROM lesson_cost AS lc
	  LEFT JOIN grade ON lc.max_grade_id = grade.grade_id
    WHERE instrument_id = @instrument AND rank >= @rank
    ORDER BY rank ASC 
    LIMIT 1
  ) AS c ON t.teacher_id = c.teacher_id
  WHERE i.instrument_id = @instrument AND rank >= @rank
  ORDER BY ${sort}
  LIMIT ?,?;
  `

  connection.query(searchTeachersSql, sqlParams, async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const numResults = response[2].length > 0 ? response[2][0].total_results : 0
    // console.log(response[2])

    const totalPages = response[2].length > 0 ? Math.ceil(numResults / resultsPerPage) : 0

    const teachers = response[2]

    for (let teacher of teachers) {
      try {
        teacher.profile_image_url = await s3Utils.getSignedUrlLink(teacher.s3_image_name)
      } catch {
        teacher.profile_image_url = ""
      }
    }

    let json = {
      num_results: numResults,
      page: frontEndPageNum,
      total_pages: totalPages,
      results: teachers
    }

    res.status(200).send(json)
  })
}

const getFavouriteTeachers = (req, res) => {
  const userId = req.information.user_id

  // console.log(userId)
  const frontEndPageNum = parseInt(req.query.page) || 1
  const mySQLPageNum = frontEndPageNum - 1;
  const resultsPerPage = 6;
  const pagestart = mySQLPageNum * resultsPerPage;

  const sql = `
  SELECT 
  f.teacher_id, 
  first_name, 
  last_name, 
  tagline, 
  bio, 
  location_title, 
  location_latitude, 
  location_longitude, 
  average_review_score, 
  s3_image_name,
  (SELECT COUNT(*) 
   FROM favourite 
   WHERE user_id = ?) AS total_results
  FROM favourite AS f
  LEFT JOIN teacher AS t ON f.teacher_id = t.teacher_id 
  LEFT JOIN user ON t.user_id = user.user_id
  WHERE f.user_id = ?
  LIMIT ?, ?
  `

  connection.query(sql, [userId, userId, pagestart, resultsPerPage], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const numResults = response.length > 0 ? response[0].total_results : 0

    const totalPages = numResults > 0 ? Math.ceil(numResults / resultsPerPage) : 0

    const teachers = response

    // console.log(teachers)

    for (let teacher of teachers) {
      try {
        teacher.profile_image_url = await s3Utils.getSignedUrlLink(teacher.s3_image_name)
      } catch {
        teacher.profile_image_url = ""
      }
    }

    let json = {
      num_results: numResults,
      page: frontEndPageNum,
      total_pages: totalPages,
      results: teachers
    }

    res.status(200).send(json)
  })
}

const updateTeacherDetails = (req, res) => {
  const body = req.body
  const teacherId = body.teacher_id
  const tagline = body.tagline
  const bio = body.bio
  const locationTitle = body.location_title
  const latitude = body.location_latitude
  const longitude = body.location_longitude
  const instrumentsTeachable = body.instruments_teachable
  const instrumentsRemovedIds = body.instruments_removed_ids

  // if (teacherId > 0) {
  let sql = `
  UPDATE teacher 
    SET tagline = ?, bio = ?, location_title = ?, location_latitude = ?, location_longitude = ? WHERE teacher.teacher_id =  @teacher_id := ?; 
  `
  let params = [tagline, bio, locationTitle, latitude, longitude, teacherId]

  // add new instruments or amend existing
  instrumentsTeachable.forEach(instrument => {
    if (instrument.id > 0) {
      sql += `
      UPDATE teacher_instrument_taught 
        SET grade_id = ?, instrument_id = ? WHERE teacher_instrument_taught.teacher_instrument_taught_id = ?; 
      `
      params.push(instrument.grade_id, instrument.instrument_id, instrument.id)
    } else {
      sql += `
      INSERT INTO teacher_instrument_taught (teacher_instrument_taught_id, teacher_id, grade_id, instrument_id) 
        VALUES (NULL, @teacher_id, ?, ?);
      `
      params.push(instrument.grade_id, instrument.instrument_id)
    }
  })

  // remove deleted instruments 
  instrumentsRemovedIds.forEach(id => {
    sql += `
    DELETE FROM teacher_instrument_taught 
    WHERE teacher_instrument_taught.teacher_instrument_taught_id = ?;
    `
    params.push(id)
  })

  sql += `
  SELECT T.teacher_id, T.tagline, T.bio, T.location_title, T.location_latitude, T.location_longitude, T.average_review_score,
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', IT.teacher_instrument_taught_id,
      'instrument_id', IT.instrument_id,
      'grade_id', IT.grade_id
    )
  ) AS instruments_teachable
    FROM teacher T
    LEFT JOIN teacher_instrument_taught IT ON T.teacher_id = IT.teacher_id
    WHERE T.teacher_id = @teacher_id
    GROUP BY T.teacher_id, T.tagline, T.bio, T.location_latitude, T.location_longitude, T.average_review_score;
  `

  connection.query(sql, params, async (err, response) => {
    // if error from mysql
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    let newTeacherDetails = response.slice(-1)[0][0]
    newTeacherDetails.instruments_teachable = JSON.parse(newTeacherDetails.instruments_teachable)

    console.log(newTeacherDetails)
    res.status(200).send(newTeacherDetails)
  })
}


const newReview = (req, res) => {
  const userID = req.information.user_id
  const rating = req.body.rating
  const details = req.body.details
  const teacherId = req.body.teacher_id
  const gradeId = req.body.grade_id
  const instrumentId = req.body.instrument_id

  console.log(req.body)

  const newReviewSql = `
  INSERT INTO review (review_id, num_stars, created_timestamp, details, user_id, teacher_id, grade_id, instrument_id) VALUES (NULL, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) 
  `

  connection.query(newReviewSql, [rating, details, userID, teacherId, gradeId, instrumentId], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    if (response.affectedRows == 0) return res.status(400).send(apiResponses.error("Database not updated", res.statusCode))

    res.status(200).send(apiResponses.success("Review posted successfully", res.statusCode))
  })
}

const getTeacherReviews = (req, res) => {
  const teacherId = req.params.teacher_id

  const frontEndPageNum = parseInt(req.query.page) || 1
  const resultsPerPage = 5;
  const mySQLPageNum = frontEndPageNum - 1;
  const pagestart = mySQLPageNum * resultsPerPage;


  const getReviewsSql = `
  SELECT COUNT(*) AS total_count
    FROM review
    WHERE review.teacher_id = ?;
  SELECT review_id, num_stars, created_timestamp, details, user.user_id AS user_id, first_name, last_name, s3_image_name, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol,grade.grade_id, grade.name AS grade_name
    FROM review
    LEFT JOIN user on review.user_id=user.user_id
    LEFT JOIN grade on review.grade_id=grade.grade_id
    LEFT JOIN instrument on review.instrument_id=instrument.instrument_id
    WHERE review.teacher_id = ?
    ORDER BY created_timestamp DESC
    LIMIT ?,?;
  `

  connection.query(getReviewsSql, [teacherId, teacherId, pagestart, resultsPerPage], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const numResults = response[0].length > 0 ? response[0][0].total_count : 0
    const totalPages = Math.ceil(numResults / resultsPerPage)

    const reviews = response[1]

    for (let review of reviews) {
      try {
        review.profile_image_url = await s3Utils.getSignedUrlLink(review.s3_image_name)
      } catch {
        review.profile_image_url = ""
      }
    }

    let json = {
      num_results: numResults,
      page: frontEndPageNum,
      total_pages: totalPages,
      results: reviews
    }

    res.status(200).send(json)
  })
}

module.exports = { getTeacherById, getTeachersSearch, getFavouriteTeachers, updateTeacherDetails, newReview, getTeacherReviews, isTeacherFavourited, favouriteTeacher, unfavouriteTeacher }