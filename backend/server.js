import fs from 'fs'
import path from 'path'
import express from 'express'
import dotenv from 'dotenv'
import colors from 'colors'
import morgan from 'morgan'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'
import connectDB from './config/db.js'

import productRoutes from './routes/productRoutes.js'
import userRoutes from './routes/userRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'

dotenv.config()

connectDB()

const app = express()

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.use(express.json())

app.use('/api/products', productRoutes)
app.use('/api/users', userRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/upload', uploadRoutes)

app.get('/api/config/paypal', (req, res) =>
  res.send(process.env.PAYPAL_CLIENT_ID)
)

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'proshop-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

const __dirname = path.resolve()
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))

const frontendBuildPath = path.resolve(__dirname, 'frontend', 'build')
const shouldServeStaticFrontend =
  process.env.NODE_ENV === 'production' &&
  process.env.SERVE_STATIC_FRONTEND === 'true' &&
  fs.existsSync(frontendBuildPath)

if (shouldServeStaticFrontend) {
  app.use(express.static(frontendBuildPath))

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(frontendBuildPath, 'index.html'))
  )
} else {
  app.get('/', (req, res) => {
    res.send('ProShop API is running. Use /api/health for health checks.')
  })
}

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
)
