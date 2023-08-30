// import dependencies
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require('../models/s3')

const bucketName = process.env.BUCKET_NAME

/**
 * Saves file object to s3 storage using originalName as key
 * @param {Object} file 
 */
const saveToS3 = async (file) => {
  const originalName = file.originalname

  const params = {
    Bucket: bucketName,
    Key: originalName,
    Body: file.buffer,
    ContentType: file.mimetype
  }

  // Upload image to s3
  const command = new PutObjectCommand(params)
  await s3.send(command)
}

/**
 * Creates a signed url for image stored in s3 storage
 * @param {*} imageName the key of the image to be provided
 * @returns {String} signed URL for image
 */
const getSignedUrlLink = async (imageName) => {

  const getObjectParams = {
    Bucket: bucketName,
    Key: imageName
  }

  const command = new GetObjectCommand(getObjectParams)
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 })
  return url
}

/**
 * Deletes an image with the specified key from s3 storage
 * @param {String} imageName 
 */
const deleteFromS3 = async (imageName) => {

  const params = {
    Bucket: bucketName,
    Key: imageName
  }

  const command = new DeleteObjectCommand(params)
  await s3.send(command)
}

module.exports = { saveToS3, getSignedUrlLink, deleteFromS3 }