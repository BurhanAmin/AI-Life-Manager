const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { createGoal, getGoals, deleteGoal } = require('../controllers/goals')

router.post('/', auth, createGoal)
router.get('/', auth, getGoals)
router.delete('/:id', auth, deleteGoal)

module.exports = router