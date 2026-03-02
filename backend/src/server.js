
require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
require('./models/associations'); // Initialize associations

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Sync models - only creates missing tables, never alters existing ones
        await sequelize.sync();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

startServer();
