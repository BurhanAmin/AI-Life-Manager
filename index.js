const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const notificationsRouter = require('./routes/notifications')

// Restrict CORS to known frontends instead of allowing every origin.
// CLIENT_URL is your deployed Vercel URL (set in Render's env vars).
const allowedOrigins = [
  'http://localhost:5173', // local Vite dev
  process.env.CLIENT_URL,  // production frontend
].filter(Boolean)

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

// Routes
app.use('/api/users', require('./routes/users'))
app.use('/api/goals', require('./routes/goals'))
app.use('/api/habits', require('./routes/habits'))
app.use('/api/calendar', require('./routes/calendar'))
app.use('/api/sessions', require('./routes/sessions'))
app.use('/api/voice', require('./routes/voice'))
app.use('/api/review', require('./routes/review'))
app.use('/api/suggestions', require('./routes/suggestions'))
app.use('/api/idle', require('./routes/idle'))
app.use('/api/burnout', require('./routes/burnout'))
app.use('/api/google', require('./routes/googleCalendar'))
app.use('/api/notifications', notificationsRouter)

app.get('/', (req, res) => res.send('AI Life Manager API running'))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))