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
const pdfSyncRoutes = require('./routes/pdfSyncRoutes');

const path = require('path');

const app = express();
const serverStartTime = new Date();

app.use(cors());
app.use(express.json());

// Request logger to help debug routing
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve uploaded files (scanned copies / PDFs)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/pdf-sync', pdfSyncRoutes);
app.use('/api/trays', trayRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/letter-kinds', letterKindRoutes);
app.use('/api/process-steps', processStepRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/letters', letterRoutes);
app.use('/api/letter-assignments', letterAssignmentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/endorsements', endorsementRoutes);
app.use('/api/role-permissions', rolePermissionRoutes);
app.use('/api/import', require('./routes/importRoutes'));

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: Math.floor((new Date() - serverStartTime) / 1000), // seconds
        timestamp: new Date()
    });
});

// Final fallback for 404s to help debugging
app.use((req, res, next) => {
    console.error(`404 - NOT FOUND: ${req.method} ${req.url}`);
    res.status(404).json({ error: "Route not found", path: req.url });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({
        error: 'System Error',
        message: err.message,
        path: req.path
    });
});

module.exports = app;
