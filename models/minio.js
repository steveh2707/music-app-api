var Minio = require('minio')

const host = process.env.MINIO_HOST
const port = process.env.MINIO_PORT
const accessKey = process.env.MINIO_ACCESS_KEY
const secretKey = process.env.MINIO_SECRET_KEY

var minioClient = new Minio.Client({
  endPoint: host,
  port: 1 * port,
  useSSL: false,
  accessKey: accessKey,
  secretKey: secretKey,
})

module.exports = minioClient;