const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/burnout')

router.get('/status', auth, ctrl.getStatus)

module.exports = router