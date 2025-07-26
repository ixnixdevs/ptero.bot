const sqlite3 = require('sqlite3').verbose();
const { DB_PATH } = require('../config');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    // Check if max_server_limit column exists
    db.get("PRAGMA table_info(user_registrations);", (err, row) => {
        if (err) {
            console.error('Failed to get table info:', err.message);
            process.exit(1);
        }
    });

    db.all("PRAGMA table_info(user_registrations);", (err, columns) => {
        if (err) {
            console.error('Failed to get table info:', err.message);
            process.exit(1);
        }
        const hasColumn = columns.some(col => col.name === 'max_server_limit');
        if (hasColumn) {
            console.log('Column max_server_limit already exists. No migration needed.');
            db.close();
            process.exit(0);
        } else {
            console.log('Adding max_server_limit column to user_registrations table...');
            db.run('ALTER TABLE user_registrations ADD COLUMN max_server_limit INTEGER NOT NULL DEFAULT 1', (alterErr) => {
                if (alterErr) {
                    console.error('Failed to add column:', alterErr.message);
                    process.exit(1);
                } else {
                    console.log('Column max_server_limit added successfully.');
                    db.close();
                    process.exit(0);
                }
            });
        }
    });
});
