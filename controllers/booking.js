const connection = require('../db')
const apiResponses = require('../utils/apiResponses')
const s3Utils = require('../utils/s3Utlis')


const datesAreOnSameDay = (first, second) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();


const getTeacherAvailability = (req, res) => {
  const teacherId = req.params.teacher_id
  const dateString = req.query.date

  // convert dateString to Date and add use dates 1 day either side for search
  const date = new Date(dateString)
  const dateStart = date.addDays(-1).yyyymmdd()
  const dateEnd = date.addDays(2).yyyymmdd()

  const sql = `
  SELECT start_time, end_time
    FROM teacher_availability 
    WHERE teacher_id = ? AND start_time BETWEEN ? AND ?;
  SELECT start_time, end_time
    FROM booking
    WHERE teacher_id = ? AND start_time BETWEEN ? AND ?;
  `

  connection.query(sql, [teacherId, dateStart, dateEnd, teacherId, dateStart, dateEnd], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    try {
      const availabilityInfo = {
        teacher_id: parseInt(teacherId),
        availability: [
          { date: date.addDays(-1), slots: [], bookings: [] },
          { date: date, slots: [], bookings: [] },
          { date: date.addDays(1), slots: [], bookings: [] }
        ]
      };

      response[0].forEach(slot => {
        // find index of existing day
        const i = availabilityInfo.availability.findIndex(e => datesAreOnSameDay(e.date, slot.start_time));

        // if day already exists in array, then add new slot to slot array
        if (i > -1) availabilityInfo.availability[i].slots.push(slot)
      })

      response[1].forEach(booking => {
        // find index of existing day
        const i = availabilityInfo.availability.findIndex(e => datesAreOnSameDay(e.date, booking.start_time));

        // if day already exists in array, then add new slot to slot array
        if (i > -1) availabilityInfo.availability[i].bookings.push(booking)
      })

      // console.log(availabilityInfo)
      res.status(200).send(availabilityInfo)

    } catch (error) {
      res.status(400).send(apiResponses.error(error, res.statusCode))
    }

  })
}


const makeBooking = (req, res) => {
  // console.log(req.body)
  // const date = req.body.date
  const startTime = new Date(req.body.start_time)
  const endTime = new Date(req.body.end_time)
  const priceFinal = req.body.price_final
  const studentId = req.information.user_id
  const teacherId = req.body.teacher_id
  const gradeId = req.body.grade_id
  const instrumentId = req.body.instrument_id

  const sql = `
  INSERT INTO booking 
  (booking_id, start_time, end_time, price_final, cancelled, cancel_reason, student_id, teacher_id, grade_id, instrument_id) 
  VALUES (NULL, ?, ?, ?, '0', NULL, ?, ?, ?, ?) 
  `

  connection.query(sql, [startTime, endTime, priceFinal, studentId, teacherId, gradeId, instrumentId], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    // console.log(response)

    if (response.affectedRows > 0) return res.status(200).send(apiResponses.success("Booking completed", res.statusCode))

    res.status(400).send(apiResponses.error("Booking not completed", res.statusCode))
  })

}

const getBookings = async (req, res) => {

  // await new Promise(resolve => setTimeout(resolve, 2000));
  try {
    const studentId = req.information.user_id
    const teacherId = req.information.user_id

    let sql = `
    SELECT B.booking_id, B.date_created, B.start_time, B.end_time, B.price_final, B.cancelled, B.cancel_reason, B.student_id, B.teacher_id,
    JSON_OBJECT('user_id', S.user_id, 'first_name', S.first_name, 'last_name', S.last_name, 's3_image_name', S.s3_image_name) AS student,
    JSON_OBJECT('user_id', TU.user_id, 'first_name', TU.first_name, 'last_name', TU.last_name, 's3_image_name', TU.s3_image_name) AS teacher,
    JSON_OBJECT('instrument_id', I.instrument_id, 'name', I.name, 'image_url', I.image_url, 'sf_symbol', I.sf_symbol) AS instrument,
    JSON_OBJECT('grade_id', G.grade_id, 'name', G.name) AS grade
      FROM booking B
      LEFT JOIN user S on B.student_id = S.user_id
      LEFT JOIN teacher T on B.teacher_id = T.teacher_id
      LEFT JOIN user TU on T.user_id = TU.user_id
      LEFT JOIN instrument I on B.instrument_id = I.instrument_id
      LEFT JOIN grade G on B.grade_id = G.grade_id
      WHERE B.student_id = ? OR B.teacher_id = ?
    GROUP BY B.booking_id
    ORDER BY B.start_time;
    `

    connection.query(sql, [studentId, teacherId], async (err, response) => {
      if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

      let bookings = response
      for (let booking of bookings) {
        // console.log(booking.start_time)
        booking.student = JSON.parse(booking.student)
        booking.teacher = JSON.parse(booking.teacher)
        booking.instrument = JSON.parse(booking.instrument)
        booking.grade = JSON.parse(booking.grade)

        try {
          booking.student.profile_image_url = await s3Utils.getSignedUrlLink(booking.student.s3_image_name)
        } catch {
          booking.student.profile_image_url = ""
        }
        try {
          booking.teacher.profile_image_url = await s3Utils.getSignedUrlLink(booking.teacher.s3_image_name)
        } catch {
          booking.teacher.profile_image_url = ""
        }
      }

      res.status(200).send({ results: bookings })
    })
  } catch (error) {
    res.status(400).send(apiResponses.error(error, res.statusCode))
  }
}



const cancelBooking = (req, res) => {
  try {
    const bookingId = req.params.booking_id
    const studentId = req.information.user_id
    const cancelReason = req.body.cancel_reason

    const sql = `
    UPDATE booking 
      SET cancelled = '1', cancel_reason = ? 
      WHERE booking.booking_id = ? AND booking.student_id = ? 
    `

    connection.query(sql, [cancelReason, bookingId, studentId], (err, response) => {
      if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

      res.status(201).send(apiResponses.success("Booking cancelled", res.statusCode))
    })

  } catch (error) {
    res.status(400).send(apiResponses.error(error, res.statusCode))
  }
}


module.exports = { getTeacherAvailability, makeBooking, getBookings, cancelBooking }