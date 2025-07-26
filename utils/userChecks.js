const { db } = require('../database');
const { logDebug, logError } = require('./logger');

/**
 * Prüft, ob ein User bereits registriert oder verlinkt ist (in user_registrations).
  * @param {string} discordUserId - Die Discord User ID
   * @param {string} guildId - Die Guild ID
    * @returns {Promise<boolean>}
     */
     async function isUserAlreadyLinked(discordUserId, guildId) {
         return new Promise((resolve, reject) => {
                 db.get('SELECT * FROM user_registrations WHERE discord_user_id = ? AND guild_id = ?',
                             [discordUserId, guildId],
                                         (err, row) => {
                                                         if (err) {
                                                                             logError('Datenbankfehler bei isUserAlreadyLinked:', err.message);
                                                                                                 return reject(err);
                                                                                                                 }

                                                                                                                                 if (row) {
                                                                                                                                                     logDebug(`isUserAlreadyLinked: User ${discordUserId} ist bereits verlinkt in Guild ${guildId}`);
                                                                                                                                                                         resolve(true);
                                                                                                                                                                                         } else {
                                                                                                                                                                                                             logDebug(`isUserAlreadyLinked: User ${discordUserId} ist NICHT verlinkt in Guild ${guildId}`);
                                                                                                                                                                                                                                 resolve(false);
                                                                                                                                                                                                                                                 }
                                                                                                                                                                                                                                                             });
                                                                                                                                                                                                                                                                 });
                                                                                                                                                                                                                                                                 }

                                                                                                                                                                                                                                                                 module.exports = {
                                                                                                                                                                                                                                                                     isUserAlreadyLinked
                                                                                                                                                                                                                                                                     };