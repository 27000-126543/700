/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import commonRoutes from './routes/common.js'
import dashboardRoutes from './routes/dashboard.js'
import alertsRoutes from './routes/alerts.js'
import approvalsRoutes from './routes/approvals.js'
import inventoryRoutes from './routes/inventory.js'
import procurementRoutes from './routes/procurement.js'
import reportsRoutes from './routes/reports.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/common', commonRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/alerts', alertsRoutes)
app.use('/api/approvals', approvalsRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/procurement', procurementRoutes)
app.use('/api/reports', reportsRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', error);
  console.error('Stack:', error.stack);
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    message: error.message,
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
