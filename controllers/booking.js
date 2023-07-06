const connection = require('../db')
const errorResponse = require('../apiError')




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
    if (err) return res.status(400).send(errorResponse(err, res.statusCode))

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
    console.log(availabilityInfo)

    res.status(200).send(availabilityInfo)
  })
}


const makeBooking = (req, res) => {
  console.log(req.body)
}


module.exports = { getTeacherAvailability, makeBooking }