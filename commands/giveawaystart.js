const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../database');
const { ADMIN_ROLE_IDS } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveawaystart')
        .setDescription('Starte ein neues Giveaway (Admin)')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name des Giveaways')
                .setRequired(true)),
    async execute(interaction) {
        const member = interaction.member;
        const hasAdminRole = member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
        if (!hasAdminRole) {
            await interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
            return;
        }
        const giveawayName = interaction.options.getString('name');
        const guildId = interaction.guildId;

        // Deactivate existing active giveaways
        db.run('UPDATE giveaways SET is_active = 0 WHERE guild_id = ? AND is_active = 1', [guildId], (err) => {
            if (err) {
                console.error('Failed to deactivate existing giveaways:', err.message);
            }
        });

        // Insert new giveaway
        db.run('INSERT INTO giveaways (guild_id, name, is_active) VALUES (?, ?, 1)', [guildId, giveawayName], function (err) {
            if (err) {
                console.error('Failed to create giveaway:', err.message);
                interaction.reply({ content: '❌ Fehler beim Erstellen des Giveaways.', ephemeral: true });
                return;
            }
            interaction.reply({ content: `✅ Giveaway "${giveawayName}" wurde gestartet! Benutzer können jetzt teilnehmen.`, ephemeral: true });
        });
    }
};
