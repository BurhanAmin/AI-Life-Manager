const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

// Routes (we'll add these as we build)
app.use('/api/users', require('./routes/users'))
app.use('/api/goals', require('./routes/goals'))
app.use('/api/habits', require('./routes/habits'))
app.use('/api/calendar', require('./routes/calendar'))
app.use('/api/sessions', require('./routes/sessions'))

app.get('/', (req, res) => res.send('AI Life Manager API running'))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))