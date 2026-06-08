const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { createUser, getUser } = require('../controllers/users')

router.post('/', auth, createUser)
router.get('/me', auth, getUser)

module.exports = router