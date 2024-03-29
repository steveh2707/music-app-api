// import dependencies
const connection = require('../models/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const apiResponses = require('../utils/apiResponses')
const s3Utils = require('../utils/s3Utlis')

const SECRET_KEY = process.env.JWT_SECRET_KEY

/**
 * function to create a new user within the database. If successful, redirect to login function to log in new user.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const newUser = async (req, res) => {
  // get data from request object
  const body = req.body
  const firstName = body.first_name
  const lastName = body.last_name
  const email = body.email
  const passwordHash = await bcrypt.hash(body.password, 10)
  const dob = body.dob

  // sql query to add new user to database
  let createNewUserSql = `
  INSERT INTO user (user_id, first_name, last_name, email, password_hash, dob, registered_timestamp, last_login_timestamp, s3_image_name) 
  VALUES (NULL, ?, ?, ?, ?, ?, now(), now(), "") 
  `

  // make connection to database and execute query with required parameters
  connection.query(createNewUserSql, [firstName, lastName, email, passwordHash, dob], async (err, response) => {
    // if error from mysql return 400 error
    if (err) {
      if (err.errno === 1062) {
        return res.status(400).send(apiResponses.error("Email already exists", res.statusCode))
      }
      return res.status(400).send(apiResponses.error(err, res.statusCode))
    }

    // if database is not updated, return error
    if (response.affectedRows == 0) return res.status(400).send(apiResponses.error("Database not updated.", res.statusCode))

    // if successful, redirect to log in function to create authorization token to provide to user
    login(req, res)
  })
}


/**
 * function to login user and respond with their user/teacher details. Also updates user's last login time to current datetime.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const login = async (req, res) => {

  const email = req.body.email
  const password = req.body.password

  const loginSql = `
  SELECT U.user_id, U.first_name, U.last_name, U.email, U.password_hash, U.dob, U.registered_timestamp, U.s3_image_name, T.teacher_id, T.tagline, T.bio, T.location_title, T.location_latitude, T.location_longitude, T.average_review_score,
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', IT.teacher_instrument_taught_id,
      'instrument_id', IT.instrument_id,
      'grade_id', IT.grade_id,
      'lesson_cost', IT.lesson_cost
    )
  ) AS instruments_teachable
    FROM user U
    LEFT JOIN teacher T ON T.user_id = U.user_id
    LEFT JOIN teacher_instrument_taught IT ON T.teacher_id = IT.teacher_id
    WHERE email = ?
    GROUP BY U.user_id, U.first_name, U.last_name, U.email, U.password_hash, U.dob, U.registered_timestamp, U.s3_image_name, T.teacher_id, T.tagline, T.bio, T.location_latitude, T.location_longitude, T.average_review_score;
  `

  connection.query(loginSql, [email], async (err, response) => {
    // if error from mysql
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    // if user provided email address does not exist in database
    if (response.length == 0) return res.status(401).send(apiResponses.error("Email address does not exist", res.statusCode))

    // compare user provided password with password stored in database
    const comparison = await bcrypt.compare(password, response[0].password_hash)

    // if match does not exist between passwords
    if (!comparison) return res.status(401).send(apiResponses.error("Incorrect password", res.statusCode))

    // update last login time
    updateLastLoginTime(response[0].user_id)

    const { user_id, first_name, last_name, email, dob, registered_timestamp, s3_image_name, teacher_id, tagline, bio, location_title, location_latitude, location_longitude, average_review_score, instruments_teachable } = response[0]

    // get a signed url link to profile image stored in s3 bucket
    let profile_image_url
    try {
      profile_image_url = await s3Utils.getSignedUrlLink(s3_image_name)
    } catch {
      profile_image_url = ""
    }

    // create token of user details
    const token = jwt.sign(JSON.stringify({ user_id, teacher_id }), SECRET_KEY)

    // create datapacket to be sent as response
    let dataPacket = {
      token: token,
      user_details: { user_id, first_name, last_name, email, dob, registered_timestamp, profile_image_url },
    }

    // if user is also a teacher, attach their teacher details to response
    if (teacher_id) {
      dataPacket.teacher_details = { teacher_id, tagline, bio, location_title, location_latitude, location_longitude, average_review_score, instruments_teachable: instruments_teachable }
    }

    console.log(dataPacket)

    // send successful response and attach datapacket
    res.status(200).send(dataPacket)
  })
}

/**
 * Query database to update the user's last login time.
 * @param {Int} userId the id of the user
 */
const updateLastLoginTime = (userId) => {

  let updateLastLoginSql = `
  UPDATE user SET last_login_timestamp = now() WHERE user.user_id = ? 
  `

  connection.query(updateLastLoginSql, [userId], async (err, response) => {
    if (err) return console.log(err)
  })
}

/**
 * Query database to update a user's details
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const updateUserDetails = (req, res) => {
  const body = req.body
  const firstName = body.first_name
  const lastName = body.last_name
  const email = body.email
  const dob = body.dob_output
  const userId = body.user_id

  const sql = `
  UPDATE user 
    SET first_name = ?, last_name = ?, email = ?, dob = ? WHERE user.user_id = ?;
  SELECT U.user_id, U.first_name, U.last_name, U.email, U.dob, U.registered_timestamp, U.s3_image_name
    FROM user U
    WHERE U.user_id = ?
  `
  connection.query(sql, [firstName, lastName, email, dob, userId, userId], async (err, response) => {
    // if error from mysql
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    let newUserDetails = response[1][0]

    try {
      newUserDetails.profile_image_url = await s3Utils.getSignedUrlLink(newUserDetails.s3_image_name)
    } catch {
      newUserDetails.profile_image_url = ""
    }

    res.status(200).send(newUserDetails)
  })
}

/**
 * Query database to get reviews that a user has created.
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
const getUsersReviews = (req, res) => {
  const userId = req.information.user_id

  const frontEndPageNum = parseInt(req.query.page) || 1
  const resultsPerPage = 5;
  const mySQLPageNum = frontEndPageNum - 1;
  const pagestart = mySQLPageNum * resultsPerPage;


  const getReviewsSql = `
  SELECT COUNT(*) AS total_count
    FROM review
    WHERE review.user_id = ?;
  SELECT review_id, num_stars, created_timestamp, details, user.user_id AS user_id, first_name, last_name, s3_image_name, instrument.instrument_id, instrument.name AS instrument_name, sf_symbol,grade.grade_id, grade.name AS grade_name
    FROM review
    LEFT JOIN user on review.teacher_id=user.user_id
    LEFT JOIN grade on review.grade_id=grade.grade_id
    LEFT JOIN instrument on review.instrument_id=instrument.instrument_id
    WHERE review.user_id = ?
    ORDER BY created_timestamp DESC
    LIMIT ?,?;
  `

  connection.query(getReviewsSql, [userId, userId, pagestart, resultsPerPage], async (err, response) => {
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

module.exports = { newUser, login, updateUserDetails, getUsersReviews }