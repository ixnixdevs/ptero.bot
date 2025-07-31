const sqlite3 = require('sqlite3').verbose();
const { DB_PATH } = require('../config');

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Failed to connect to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');

        // Check if expiration column exists in user_servers table
        db.get("PRAGMA table_info(user_servers);", (err, row) => {
            if (err) {
                console.error('Failed to get table info for user_servers:', err.message);
                return;
            }
            db.all("PRAGMA table_info(user_servers);", (err, columns) => {
                if (err) {
                    console.error('Failed to get columns for user_servers:', err.message);
                    return;
                }
                const hasExpiration = columns.some(col => col.name === 'expiration');
                if (!hasExpiration) {
                    console.log('Adding expiration column to user_servers table...');
                    db.run('ALTER TABLE user_servers ADD COLUMN expiration INTEGER', (alterErr) => {
                        if (alterErr) {
                            console.error('Failed to add expiration column:', alterErr.message);
                        } else {
                            console.log('Expiration column added successfully.');
                        }
                    });
                }
            });
        });

        // Check if max_server_limit column exists in user_registrations table
        db.get("PRAGMA table_info(user_registrations);", (err, row) => {
            if (err) {
                console.error('Failed to get table info for user_registrations:', err.message);
                return;
            }
            db.all("PRAGMA table_info(user_registrations);", (err, columns) => {
                if (err) {
                    console.error('Failed to get columns for user_registrations:', err.message);
                    return;
                }
                const hasMaxServerLimit = columns.some(col => col.name === 'max_server_limit');
                if (!hasMaxServerLimit) {
                    console.log('Adding max_server_limit column to user_registrations table...');
                    db.run('ALTER TABLE user_registrations ADD COLUMN max_server_limit INTEGER NOT NULL DEFAULT 1', (alterErr) => {
                        if (alterErr) {
                            console.error('Failed to add max_server_limit column:', alterErr.message);
                        } else {
                            console.log('max_server_limit column added successfully.');
                        }
                    });
                }
            });
        });
    }
});

// Create tables if not exist
const tableStatements = [
    `CREATE TABLE IF NOT EXISTS user_registrations (
        discord_user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        email TEXT NOT NULL,
        username TEXT NOT NULL,
        pelican_user_id TEXT,
        max_server_limit INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (discord_user_id, guild_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_servers (
        discord_user_id TEXT PRIMARY KEY,
        server_id TEXT,
        egg_id INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS user_blacklist (
        discord_user_id TEXT PRIMARY KEY
    )`,
    `CREATE TABLE IF NOT EXISTS shop_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS giveaway_participants (
        giveaway_id INTEGER NOT NULL,
        discord_user_id TEXT NOT NULL,
        claimed INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (giveaway_id, discord_user_id),
        FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
    )`
];
tableStatements.forEach(stmt => db.run(stmt));

async function isShopEnabled() {
    return new Promise((resolve) => {
        db.get('SELECT enabled FROM shop_settings WHERE id = 1', (err, row) => {
            if (err) {
                console.error('Failed to get shop enabled state:', err.message);
                resolve(true); // default to enabled on error
            } else if (!row) {
                // Insert default enabled row
                db.run('INSERT INTO shop_settings (id, enabled) VALUES (1, 1)', (insertErr) => {
                    if (insertErr) {
                        console.error('Failed to insert default shop setting:', insertErr.message);
                    }
                    resolve(true);
                });
            } else {
                resolve(row.enabled === 1);
            }
        });
    });
}

async function setShopEnabled(enabled) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO shop_settings (id, enabled) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled', [enabled ? 1 : 0], (err) => {
            if (err) {
                console.error('Failed to set shop enabled state:', err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

module.exports = { db, isShopEnabled, setShopEnabled }; 