const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveawayenter')
        .setDescription('Nimm am aktuellen Giveaway teil'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        // Get active giveaway
        db.get('SELECT * FROM giveaways WHERE guild_id = ? AND is_active = 1', [guildId], (err, giveaway) => {
            if (err) {
                console.error('Failed to fetch active giveaway:', err.message);
                interaction.reply({ content: '❌ Fehler beim Abrufen des Giveaways.', ephemeral: true });
                return;
            }
            if (!giveaway) {
                interaction.reply({ content: '⚠️ Es gibt kein aktives Giveaway.', ephemeral: true });
                return;
            }
            // Check if user already entered
            db.get('SELECT * FROM giveaway_participants WHERE giveaway_id = ? AND discord_user_id = ?', [giveaway.id, userId], (err2, participant) => {
                if (err2) {
                    console.error('Failed to check giveaway participant:', err2.message);
                    interaction.reply({ content: '❌ Fehler beim Überprüfen der Teilnahme.', ephemeral: true });
                    return;
                }
                if (participant) {
                    interaction.reply({ content: '⚠️ Du hast bereits am Giveaway teilgenommen.', ephemeral: true });
                    return;
                }
                // Insert participant
                db.run('INSERT INTO giveaway_participants (giveaway_id, discord_user_id) VALUES (?, ?)', [giveaway.id, userId], (err3) => {
                    if (err3) {
                        console.error('Failed to add giveaway participant:', err3.message);
                        interaction.reply({ content: '❌ Fehler beim Hinzufügen zur Teilnahme.', ephemeral: true });
                        return;
                    }
                    interaction.reply({ content: `✅ Du hast erfolgreich am Giveaway "${giveaway.name}" teilgenommen!`, ephemeral: true });
                });
            });
        });
    }
};
