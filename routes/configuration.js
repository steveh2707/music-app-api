// import dependencies
const express = require('express')
const router = express.Router();
const configurationController = require('../controllers/configuration')

// define all endpoints following '/configuration' and call controller functions
router
  .get('/', configurationController.getConfiguration)

module.exports = router;