const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { startSession, sendMessage, endSession } = require('../controllers/sessions')

router.post('/start', auth, startSession)
router.post('/message', auth, sendMessage)
router.post('/end', auth, endSession)

module.exports = router