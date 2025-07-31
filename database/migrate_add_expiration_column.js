'use strict';

module.exports = {
  up: function (db) {
    return new Promise((resolve, reject) => {
      db.run('ALTER TABLE user_servers ADD COLUMN expiration INTEGER', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  down: function (db) {
    // SQLite does not support dropping columns easily, so this is a no-op or requires table recreation
    return Promise.resolve();
  }
};
