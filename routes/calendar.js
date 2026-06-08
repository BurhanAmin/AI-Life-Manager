const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { createEvent, getEvents, deleteEvent } = require('../controllers/calendar')

router.post('/', auth, createEvent)
router.get('/', auth, getEvents)
router.delete('/:id', auth, deleteEvent)

module.exports = router