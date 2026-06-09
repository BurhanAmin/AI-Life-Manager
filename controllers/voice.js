const multer = require('multer')
const { OpenAI } = require('openai')
const { ElevenLabsClient } = require('elevenlabs')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })

// Store audio in memory, not disk
const upload = multer({ storage: multer.memoryStorage() })

const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' })

    // Whisper requires a File-like object — wrap the buffer
    const audioFile = new File([req.file.buffer], 'audio.webm', { type: req.file.mimetype })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1'
    })

    res.json({ transcript: transcription.text })
  } catch (err) {
    console.error('Transcribe error:', err)
    res.status(500).json({ error: err.message || 'Transcription failed' })
  }
}

const speakText = async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: 'No text provided' })

    const audioStream = await elevenlabs.textToSpeech.convertAsStream(
      process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb', // default: George
      {
        text,
        model_id: 'eleven_turbo_v2_5',
        output_format: 'mp3_44100_128'
      }
    )

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')

    for await (const chunk of audioStream) {
      res.write(chunk)
    }

    res.end()
  } catch (err) {
    console.error('Speak error:', err)
    res.status(500).json({ error: err.message || 'Text-to-speech failed' })
  }
}

module.exports = { upload, transcribeAudio, speakText }