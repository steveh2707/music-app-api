const express = require('express')
const router = express.Router();
const configurationController = require('../controllers/configuration')


router
  .get('/', configurationController.getConfiguration)

module.exports = router;