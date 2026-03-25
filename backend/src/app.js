const express = require('express');
const cors = require('cors');
const trayRoutes = require('./routes/trayRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const statusRoutes = require('./routes/statusRoutes');
const letterKindRoutes = require('./routes/letterKindRoutes');
const processStepRoutes = require('./routes/processStepRoutes');
const userRoutes = require('./routes/userRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const letterRoutes = require('./routes/letterRoutes');
const letterAssignmentRoutes = require('./routes/letterAssignmentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const commentRoutes = require('./routes/commentRoutes');
const personRoutes = require('./routes/personRoutes');
const endorsementRoutes = require('./routes/endorsementRoutes');
const rolePermissionRoutes = require('./routes/rolePermissionRoutes');
const systemPageRoutes = require('./routes/systemPageRoutes');
const pdfSyncRoutes = require('./routes/pdfSyncRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const authRoutes = require('./routes/authRoutes');
const interDeptRoutes = require('./routes/interDeptRoutes');

const path = require('path');

const app = express();
app.set('trust proxy', 1); // Enable trusting proxy headers (important for Proxmox/Docker)
const serverStartTime = new Date();
const shouldLogRequests = process.env.REQUEST_LOGS === 'true' || process.env.NODE_ENV !== 'production';
const slowRequestLogsEnabled = process.env.SLOW_REQUEST_LOGS !== 'false';
const slowRequestThresholdMs = Number.parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000', 10);

app.use(cors());
app.use(express.json());

// Log slow requests to help pinpoint latency hotspots
if (slowRequestLogsEnabled) {
    app.use((req, res, next) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
            if (durationMs >= (Number.isFinite(slowRequestThresholdMs) ? slowRequestThresholdMs : 1000)) {
                console.warn(`[SLOW] ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(1)}ms`);
            }
        });
        next();
    });
}

// Request logger to help debug routing
if (shouldLogRequests) {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Debug: Force log every hit to telegram webhook specifically
app.use('/api/telegram', (req, res, next) => {
    console.log(`[BOT-DEBUG] Telegram Route Hit: ${req.method} ${req.url}`);
    next();
});

// --- HEALTH CHECKS ---
const healthHandler = (req, res) => {
    res.json({
        status: 'OK',
        uptime: Math.floor((new Date() - serverStartTime) / 1000),
        timestamp: new Date(),
        node: process.version,
        env: process.env.NODE_ENV || 'development'
    });
};

app.get('/health', healthHandler);

// --- API ROUTES ---
const apiRouter = express.Router();

// Register Health check inside apiRouter as well
apiRouter.get('/health', healthHandler);
apiRouter.get('/api-check', healthHandler); // Support health check via /api/api-check too

// Register all other routers onto the apiRouter
apiRouter.use('/auth', authRoutes);
apiRouter.use('/pdf-sync', pdfSyncRoutes);
apiRouter.use('/trays', trayRoutes);
apiRouter.use('/departments', departmentRoutes);
apiRouter.use('/statuses', statusRoutes);
apiRouter.use('/letter-kinds', letterKindRoutes);
apiRouter.use('/process-steps', processStepRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/attachments', attachmentRoutes);
apiRouter.use('/letters', letterRoutes);
apiRouter.use('/letter-assignments', letterAssignmentRoutes);
apiRouter.use('/stats', statsRoutes);
apiRouter.use('/comments', commentRoutes);
apiRouter.use('/persons', personRoutes);
apiRouter.use('/endorsements', endorsementRoutes);
apiRouter.use('/role-permissions', rolePermissionRoutes);
apiRouter.use('/system-pages', systemPageRoutes);
apiRouter.use('/telegram', telegramRoutes);
apiRouter.use('/inter-dept', interDeptRoutes);
apiRouter.use('/import', require('./routes/importRoutes'));

// Mount the apiRouter
app.use('/api', apiRouter);

// Final fallback for 404s to help debugging
app.use((req, res, next) => {
    if (shouldLogRequests) {
        console.error(`404 - NOT FOUND: ${req.method} ${req.url}`);
    }
    res.status(404).json({ error: "Route not found", path: req.url });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    if (process.env.LOG_LEVEL === 'debug') {
        console.error('SERVER ERROR [DEBUG]:', err.stack);
    } else {
        console.error(`SERVER ERROR: ${err.message} at ${req.method} ${req.url}`);
    }

    res.status(500).json({
        error: 'System Error',
        message: 'Something went wrong, but don\'t worry—we\'re on it.',
        details: process.env.LOG_LEVEL === 'debug' ? err.message : undefined
    });
});

module.exports = app;
