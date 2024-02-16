// import dependencies
const mysql = require('mysql')
require('dotenv').config()

/**
 * define parameters to allow pool connection to database
 */
const pool = mysql.createPool({
  connectionLimit: 2,
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  multipleStatements: true,
  waitForConnections: true,
  queueLimit: 10
});

/**
 * Make connection to database
 */
pool.getConnection((err) => {
  if (err) return console.log(err.message);
  console.log("connected to db using createPool");
});

module.exports = pool;

