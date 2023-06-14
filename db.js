const mysql = require('mysql')
require('dotenv').config()

const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: process.env.MAMP_PASSWORD,
  database: 'music_app',
  port: process.env.MAMP_PORT,
  multipleStatements: true,
  waitForConnections: true,
  queueLimit: 10
});

pool.getConnection((err) => {
  if (err) return console.log(err.message);
  console.log("connected to db using createPool");
});

module.exports = pool;