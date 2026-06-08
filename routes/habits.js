const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { createHabit, getHabits, logHabit, getHabitLogs } = require('../controllers/habits')

router.post('/', auth, createHabit)
router.get('/', auth, getHabits)
router.post('/log', auth, logHabit)
router.get('/logs', auth, getHabitLogs)

module.exports = router