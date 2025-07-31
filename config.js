require('dotenv').config();

const ADMIN_ROLE_IDS = process.env.ADMIN_ROLE_IDS ? process.env.ADMIN_ROLE_IDS.split(',') : [];

module.exports = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
    CLIENT_ID: process.env.CLIENT_ID || '',
    GUILD_ID: process.env.GUILD_ID || '',
    PANEL_DOMAIN: process.env.PANEL_DOMAIN || '',
    API_URL_USER_CREATE: process.env.API_URL_USER_CREATE || '',
    API_URL_SERVER_CREATE: process.env.API_URL_SERVER_CREATE || '',
    API_URL_ALLOCATIONS: process.env.API_URL_ALLOCATIONS || '',
    API_URL_USER_FETCH: process.env.API_URL_USER_FETCH || '',
    API_KEY: process.env.API_KEY || '',
    LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '',
    DB_PATH: process.env.DB_PATH || './data.db',
    BOT_STATUS: process.env.BOT_STATUS || 'online', //  'online', 'idle', 'dnd', 'invisible'
    // Admin role IDs allowed to use blacklist command
    ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS || '', // Replace with actual role IDs
    DEBUG_LOGGING: process.env.DEBUG_LOGGING === 'true', // false = keine Logs
    LOG_PREFIX: process.env.LOG_PREFIX || '[LOG]', // Optionaler Prefix für alle Logs,
    SERVER_ENVIRONMENT: {
        // Add environment variables here as key-value pairs
        // Example:
        "NODE_ENV": "production",
        "PORT": "3000",
        AUTO_UPDATE: true,
        PY_FILE: "app.py",
        REQUIREMENTS_FILE: "requirements.txt",
        USER_UPLOAD: false,
        MAIN_FILE: "index.js",
        JARFILE: "jar.jar"
    },
    SERVER_LIMITS: {
        memory: 512, // Memory in MB
        swap: 0,
        disk: 1024, // Disk space in MB
        io: 500,
        cpu: 100 // CPU percentage
    },
    SERVER_FEATURE_LIMITS: {
        databases: 1,
        backups: 0
    },
    SERVER_ALLOCATION_DEFAULT: 1 // Default allocation ID
};
