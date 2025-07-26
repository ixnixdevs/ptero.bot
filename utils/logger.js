const { DEBUG_LOGGING, LOG_PREFIX = '[BOT]' } = require('../config');

function logDebug(...args) {
        if (DEBUG_LOGGING) {
                    console.log(`${LOG_PREFIX} [DEBUG]`, ...args);
        }
}

function logError(...args) {
        if (DEBUG_LOGGING) {
                    console.error(`${LOG_PREFIX} [ERROR]`, ...args);
        }
}

function logInfo(...args) {
        if (DEBUG_LOGGING) {
                    console.info(`${LOG_PREFIX} [INFO]`, ...args);
        }
}

module.exports = {
        logDebug,
            logError,
                logInfo
};