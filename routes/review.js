const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { generateReview, getLatestReview } = require('../controllers/review')

router.post('/generate', auth, generateReview)
router.get('/latest', auth, getLatestReview)

module.exports = router