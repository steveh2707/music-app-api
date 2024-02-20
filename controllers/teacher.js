// import dependencies
const connection = require('../models/db')
const apiResponses = require('../utils/apiResponses')
const s3Utils = require('../utils/s3Utlis')

/**
 * Query database to get a teachers details by their id
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const getTeacherById = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const teacherId = req.params.teacher_id

  const getTeacherSql = `
  SELECT user.user_id, @teacher := teacher_id AS teacher_id, first_name, last_name, tagline, bio, location_title, location_latitude, location_longitude, average_review_score, s3_image_name
    FROM teacher 
    LEFT JOIN user on teacher.user_id=user.user_id
    WHERE teacher.teacher_id = ?;
  SELECT teacher_instrument_taught.teacher_instrument_taught_id, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol, grade.grade_id, grade.name AS grade_name, lesson_cost
    FROM teacher_instrument_taught
    LEFT JOIN instrument on teacher_instrument_taught.instrument_id=instrument.instrument_id
    LEFT JOIN grade on teacher_instrument_taught.grade_id=grade.grade_id
    WHERE teacher_instrument_taught.teacher_id = @teacher
    ORDER BY instrument.name ASC, grade.rank ASC;
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

    if (typeof teacherDetails == 'undefined') return res.status(404).send()

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

/**
 * Query database to check whether user has favourited teacher
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
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

/**
 * Query database to insert a record for a user favouriting a teacher.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
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

/**
 * Query database to remove a record of a user's favourite of a teacher.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
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

/**
 * Check through array of objects to return only the object that has the minimum rank.
 * @param {[Object]} dataArray 
 * @returns 
 */
function findMinRankObject(dataArray) {
  if (dataArray.length === 0) {
    return null; // Handle empty array case
  }

  return dataArray.reduce((minRankObject, currentObject) => {
    if (currentObject.rank < minRankObject.rank) {
      return currentObject;
    } else {
      return minRankObject;
    }
  }, dataArray[0]);
}

/**
 * Query database to search for teachers based on search criteria.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const getTeachersSearch = async (req, res) => {
  // await new Promise(resolve => setTimeout(resolve, 1000));

  console.log(req.body)
  console.log(req.params)

  const frontEndPageNum = parseInt(req.query.page) || 1
  const mySQLPageNum = frontEndPageNum - 1;
  const resultsPerPage = 6;
  const pagestart = mySQLPageNum * resultsPerPage;

  const userLatitude = req.body.user_latitude
  const userLongitude = req.body.user_longitude
  const instrumentId = req.body.instrument_id || "11"
  const gradeRankId = req.body.grade_rank_id || "0"
  const sort = req.body.selected_sort

  // build up array of parameters to be used for SQL query
  let sqlParams = [instrumentId, gradeRankId]

  // if location information is provided create an addon to SQL query that can be injected later
  let locationAddon = ""
  if (userLatitude && userLongitude) {
    // locationAddon = `
    // , 111.111 *
    //     DEGREES(ACOS(LEAST(1.0, COS(RADIANS(location_latitude))
    //       * COS(RADIANS(?))
    //       * COS(RADIANS(location_longitude - ?))
    //       + SIN(RADIANS(location_latitude))
    //       * SIN(RADIANS(?))))) AS distance_in_km`
    // sqlParams.push(userLatitude, userLongitude, userLatitude)

    //   locationAddon = `
    //   , ST_Distance_Sphere(
    //     point(location_longitude, location_latitude),
    //     point(?, ?)
    // )  AS distance_in_km
    //   `
    //   sqlParams.push(userLongitude, userLatitude)

    locationAddon = `
  , ST_Distance_Sphere(
    point(location_latitude, location_longitude),
    point(?, ?)
  )/1000  AS distance_in_km
  `
    sqlParams.push(userLatitude, userLongitude)
  }

  sqlParams.push(pagestart, resultsPerPage)

  // create query for teacher search
  let searchTeachersSql = `
  SET @instrument := ?;
  SET @rank := ?;
  SELECT 
    t.teacher_id,
    u.first_name,
    u.last_name,
    t.tagline,
    t.bio,
    t.location_title,
    t.location_latitude,
    t.location_longitude,
    t.average_review_score,
    u.s3_image_name,
    s3_image_name, 
    JSON_ARRAYAGG(
    	JSON_OBJECT(
          'teacher_instrument_taught_id', ti.teacher_instrument_taught_id,
      		'instrument_id', ti.instrument_id,
          'instrument_name', i.name,
          'sf_symbol', i.sf_symbol,
      		'grade_id', ti.grade_id,
          'grade_name', g.name,
      		'lesson_cost', ti.lesson_cost, 
          'rank', g.rank
    	)
    ) as instrument_teachable
    ${locationAddon}
  FROM teacher AS t
  LEFT JOIN user u ON t.user_id = u.user_id
  LEFT JOIN teacher_instrument_taught AS ti ON t.teacher_id = ti.teacher_id
  LEFT JOIN grade AS g ON ti.grade_id = g.grade_id
  LEFT JOIN instrument AS i ON ti.instrument_id = i.instrument_id
  WHERE i.instrument_id = @instrument AND g.rank >= @rank
  GROUP BY t.teacher_id, u.first_name, u.last_name, t.tagline, t.bio, t.location_title, t.location_latitude, t.location_longitude, t.average_review_score, u.s3_image_name
  ORDER BY ${sort}
  LIMIT ?,?;

  SELECT COUNT(DISTINCT(t.teacher_id)) as total_results FROM teacher AS t
  RIGHT JOIN teacher_instrument_taught AS ti ON t.teacher_id = ti.teacher_id
  LEFT JOIN grade AS g ON ti.grade_id = g.grade_id
  LEFT JOIN instrument AS i ON ti.instrument_id = i.instrument_id
  WHERE i.instrument_id = @instrument AND g.rank >= @rank
  `

  // query database using SQL query and parameters
  connection.query(searchTeachersSql, sqlParams, async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const numResults = response[3][0].total_results || 0

    const totalPages = Math.ceil(numResults / resultsPerPage)

    const teachers = response[2]

    // iterate through each teacher found
    for (let teacher of teachers) {
      // teacher.instrument_teachable = JSON.parse(teacher.instrument_teachable)

      if (teacher.instrument_teachable.length > 1) {
        teacher.instrument_teachable = findMinRankObject(teacher.instrument_teachable)
      } else {
        teacher.instrument_teachable = teacher.instrument_teachable[0]
      }

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

/**
 * Query database to return details for all favourited teachers.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
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

/**
 * Query database to add a new teacher.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const newTeacher = (req, res) => {
  const body = req.body
  const userId = req.information.user_id
  const tagline = body.tagline
  const bio = body.bio
  const locationTitle = body.location_title
  const latitude = body.location_latitude
  const longitude = body.location_longitude
  const instrumentsTeachable = body.instruments_teachable

  let sql = `
  INSERT INTO teacher (teacher_id, tagline, bio, location_title, location_latitude, location_longitude, average_review_score, user_id) 
  VALUES (NULL, ?, ?, ?, ?, ?, 0, ?);
  SELECT @teacher_id := teacher_id FROM teacher WHERE teacher_id = LAST_INSERT_ID();
  `
  let params = [tagline, bio, locationTitle, latitude, longitude, userId]

  instrumentsTeachable.forEach(instrument => {
    sql += `
      INSERT INTO teacher_instrument_taught (teacher_instrument_taught_id, lesson_cost, teacher_id, grade_id, instrument_id) 
        VALUES (NULL, ?, @teacher_id, ?, ?);
      `
    params.push(instrument.lesson_cost, instrument.grade_id, instrument.instrument_id)
  })

  sql += `
  SELECT T.teacher_id, T.tagline, T.bio, T.location_title, T.location_latitude, T.location_longitude, T.average_review_score,
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', IT.teacher_instrument_taught_id,
      'instrument_id', IT.instrument_id,
      'grade_id', IT.grade_id,
      'lesson_cost', IT.lesson_cost
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
    // newTeacherDetails.instruments_teachable = JSON.parse(newTeacherDetails.instruments_teachable)

    console.log(newTeacherDetails)
    res.status(200).send(newTeacherDetails)
  })
}

/**
 * Query database to update details of an existing teacher.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
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
        SET lesson_cost = ?, grade_id = ?, instrument_id = ? WHERE teacher_instrument_taught.teacher_instrument_taught_id = ?; 
      `
      params.push(instrument.lesson_cost, instrument.grade_id, instrument.instrument_id, instrument.id)
    } else {
      sql += `
      INSERT INTO teacher_instrument_taught (teacher_instrument_taught_id, lesson_cost, teacher_id, grade_id, instrument_id) 
        VALUES (NULL, ?, @teacher_id, ?, ?);
      `
      params.push(instrument.lesson_cost, instrument.grade_id, instrument.instrument_id)
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
      'grade_id', IT.grade_id,
      'lesson_cost', IT.lesson_cost
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
    // newTeacherDetails.instruments_teachable = JSON.parse(newTeacherDetails.instruments_teachable)

    // console.log(newTeacherDetails)
    res.status(200).send(newTeacherDetails)
  })
}

/**
 * Query database to add a new review of a teacher.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const newReview = (req, res) => {
  const userID = req.information.user_id
  const rating = req.body.rating
  const details = req.body.details
  const teacherId = req.body.teacher_id
  const gradeId = req.body.grade_id
  const instrumentId = req.body.instrument_id

  const newReviewSql = `
  INSERT INTO review (review_id, num_stars, created_timestamp, details, user_id, teacher_id, grade_id, instrument_id) VALUES (NULL, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?) 
  `

  connection.query(newReviewSql, [rating, details, userID, teacherId, gradeId, instrumentId], async (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    if (response.affectedRows == 0) return res.status(400).send(apiResponses.error("Database not updated", res.statusCode))

    res.status(200).send(apiResponses.success("Review posted successfully", res.statusCode))
  })
}

/**
 * Query database to get reviews about a teacher.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
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

/**
 * Query database to get all of a teachers availability slots in the future.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const getTeacherAvailability = (req, res) => {
  const teacherId = req.information.teacher_id

  const sql = `
  SELECT teacher_availability_id, start_time, end_time 
    FROM teacher_availability 
    WHERE teacher_id = ? 
    AND start_time > CURRENT_TIMESTAMP() 
    AND deleted = 0;
  `

  connection.query(sql, [teacherId], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    res.status(200).send({ results: response })
  })
}


/**
 * Query database to add a new availability slot for a teacher.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const newAvailabilitySlot = (req, res) => {
  const teacherId = req.information.teacher_id
  const startTime = new Date(req.body.start_time).yyyymmddhhmmss()
  const endTime = new Date(req.body.end_time).yyyymmddhhmmss()
  // console.log(req.information)
  // console.log(req.body)

  const sql = `
  INSERT INTO teacher_availability (teacher_availability_id, start_time, end_time, deleted, teacher_id) 
  VALUES (NULL, ?, ?, '0', ?) 
  `

  connection.query(sql, [startTime, endTime, teacherId], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))
    if (response.affectedRows == 0) return res.status(400).send(apiResponses.error("Database not updated", res.statusCode))

    getTeacherAvailability(req, res)
  })
}


/**
 * Query database to edit an existing availability slot.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const editAvailabilitySlot = (req, res) => {
  const teacherId = req.information.teacher_id
  const teacherAvailabilityId = req.body.teacher_availability_id
  const startTime = new Date(req.body.start_time).yyyymmddhhmmss()
  const endTime = new Date(req.body.end_time).yyyymmddhhmmss()

  // console.log(req.information)
  // console.log(req.body)

  const sql = `
  UPDATE teacher_availability SET start_time = ?, end_time = ? 
  WHERE teacher_availability.teacher_availability_id = ? AND teacher_id = ? 
  `

  connection.query(sql, [startTime, endTime, teacherAvailabilityId, teacherId], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))
    if (response.affectedRows == 0) return res.status(400).send(apiResponses.error("Database not updated", res.statusCode))

    getTeacherAvailability(req, res)
  })
}


/**
 * Query database to delete an existing availability slot.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const deleteAvailabilitySlot = (req, res) => {
  const teacherId = req.information.teacher_id
  const teacherAvailabilityId = req.params.teacher_availability_id

  const sql = `
  UPDATE teacher_availability SET deleted = 1 
  WHERE teacher_availability.teacher_availability_id = ? AND teacher_id = ?;
  `

  connection.query(sql, [teacherAvailabilityId, teacherId], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))
    if (response.affectedRows == 0) return res.status(400).send(apiResponses.error("Database not updated", res.statusCode))

    getTeacherAvailability(req, res)
  })
}


module.exports = { getTeacherById, getTeachersSearch, getFavouriteTeachers, newTeacher, updateTeacherDetails, newReview, getTeacherReviews, isTeacherFavourited, favouriteTeacher, unfavouriteTeacher, getTeacherAvailability, newAvailabilitySlot, editAvailabilitySlot, deleteAvailabilitySlot }