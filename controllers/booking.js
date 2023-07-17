const connection = require('../db')
const apiResponses = require('../utils/apiResponses')

const getTeacherAvailability = (req, res) => {
  const teacherId = req.params.teacher_id
  const dateString = req.query.date

  // convert dateString to Date and add use dates 1 day either side for search
  const date = new Date(dateString)
  const dateStart = date.addDays(-1).yyyymmdd()
  const dateEnd = date.addDays(1).yyyymmdd()

  const sql = `
  SELECT date, start_time, end_time, teacher_id 
    FROM teacher_availability 
    WHERE teacher_id = ? AND date BETWEEN ? AND ?;
  SELECT date, start_time, end_time, teacher_id
    FROM booking
    WHERE teacher_id = ? AND date BETWEEN ? AND ?;
  `

  connection.query(sql, [teacherId, dateStart, dateEnd, teacherId, dateStart, dateEnd], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    const availabilityInfo = {
      teacher_id: parseInt(teacherId),
      availability: [
        { date: dateStart, slots: [], bookings: [] },
        { date: date.yyyymmdd(), slots: [], bookings: [] },
        { date: dateEnd, slots: [], bookings: [] }
      ]
    };

    response[0].forEach(slot => {
      let newDate = slot.date.yyyymmdd()

      // find index of existing day
      const i = availabilityInfo.availability.findIndex(e => e.date === newDate);
      // if day already exists in array, then add new slot to slot array
      if (i > -1) {
        availabilityInfo.availability[i].slots.push({
          start_time: slot.start_time.substring(0, 5),
          end_time: slot.end_time.substring(0, 5)
        })
      }
    })

    // console.log(response[1])

    response[1].forEach(booking => {
      let newDate = booking.date.yyyymmdd()

      // find index of existing day
      const i = availabilityInfo.availability.findIndex(e => e.date === newDate);
      // if day already exists in array, then add new slot to slot array
      if (i > -1) {
        availabilityInfo.availability[i].bookings.push({
          start_time: booking.start_time.substring(0, 5),
          end_time: booking.end_time.substring(0, 5)
        })
      }
    })
    // console.log(availabilityInfo)

    res.status(200).send(availabilityInfo)
  })
}


const makeBooking = (req, res) => {
  // console.log(req.body)
  const date = req.body.date
  const startTime = req.body.start_time
  const endTime = req.body.end_time
  const priceFinal = req.body.price_final
  const studentId = req.information.user_id
  const teacherId = req.body.teacher_id
  const gradeId = req.body.grade_id
  const instrumentId = req.body.instrument_id

  const sql = `
  INSERT INTO booking 
  (booking_id, date, start_time, end_time, price_final, cancelled, cancel_reason, student_id, teacher_id, grade_id, instrument_id) 
  VALUES (NULL, ?, ?, ?, ?, '0', NULL, ?, ?, ?, ?) 
  `

  connection.query(sql, [date, startTime, endTime, priceFinal, studentId, teacherId, gradeId, instrumentId], (err, response) => {
    if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

    console.log(response)

    if (response.affectedRows > 0) return res.status(200).send(apiResponses.success("Booking completed", res.statusCode))

    res.status(400)
  })

}

const getUsersBookings = async (req, res) => {

  // await new Promise(resolve => setTimeout(resolve, 2000));
  try {
    const studentId = req.information.user_id

    const sql = `
    SELECT booking_id, date_created, date, start_time, end_time, price_final, cancelled, cancel_reason, student_id, instrument.instrument_id, instrument.name AS instrument_name, instrument.sf_symbol AS instrumend_sf_symbol, instrument.image_url AS instrument_image_url, grades.grade_id, grades.name AS grade_name, teacher.teacher_id,  first_name AS teacher_first_name, last_name AS teacher_last_name, profile_image_url AS teacher_profile_image_url
      FROM booking 
      LEFT JOIN teacher on booking.teacher_id = teacher.teacher_id
      LEFT JOIN user on teacher.user_id = user.user_id
      LEFT JOIN instrument on booking.instrument_id = instrument.instrument_id
      LEFT JOIN grades on booking.grade_id = grades.grade_id
      WHERE student_id = ?
      ORDER BY date
  `

    connection.query(sql, [studentId], (err, response) => {
      if (err) return res.status(400).send(apiResponses.error(err, res.statusCode))

      res.status(200).send({ results: response })
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


module.exports = { getTeacherAvailability, makeBooking, getUsersBookings, cancelBooking }