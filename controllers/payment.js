const connection = require('../db')
const apiResponses = require('../utils/apiResponses')


const getOutstandingBalances = (req, res) => {

}

const makePayment = (req, res) => {
  const studentId = req.information.user_id
  const teacherId = req.params.teacher_id
  const paymentAmount = req.params.payment_amount

  const sql = `
  SET @student_id := ?;
  SET @teacher_id := ?;
  SET @payment_amount := ?;

  SELECT payment_id, @most_recent_payment := timestamp AS timestamp, amount, @outstanding := outstanding AS outstanding, student_id, teacher_id 
    FROM payment 
    WHERE student_id = @student_id 
    AND teacher_id = @teacher_id 
    ORDER BY timestamp DESC LIMIT 1;

  SELECT @recent_booking_balance := COALESCE(SUM(price_final),0) AS recent_booking_balance
    FROM booking 
    WHERE student_id = @student_id AND teacher_id = @teacher_id AND date_created BETWEEN @most_recent_payment AND CURRENT_TIMESTAMP;

  INSERT INTO payment (payment_id, timestamp, amount, outstanding, student_id, teacher_id) 
    VALUES (NULL, CURRENT_TIMESTAMP, @payment_amount, @outstanding - @payment_amount, @student_id, @teacher_id);
  `
}


module.exports = { getOutstandingBalances, makePayment }