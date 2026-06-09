const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { upload, transcribeAudio, speakText } = require('../controllers/voice')
 
router.post('/transcribe', auth, upload.single('audio'), transcribeAudio)
router.post('/speak', auth, speakText)
 
module.exports = router