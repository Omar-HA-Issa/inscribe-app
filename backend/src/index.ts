import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('documents')
      .select('count')
      .limit(1)

    if (error) throw error

    res.json({
      success: true,
      message: 'Database connection working!',
      data
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
})