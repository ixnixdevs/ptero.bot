const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../database');
const { ADMIN_ROLE_IDS } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unblacklist')
        .setDescription('Remove a Discord user ID from the blacklist')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord user ID to unblacklist')
                .setRequired(true)
        ),
    async execute(interaction) {
        const member = interaction.member;
        const hasAdminRole = member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
        if (!hasAdminRole) {
            await interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
            return;
        }
        const userId = interaction.options.getString('userid');
        db.run('DELETE FROM user_blacklist WHERE discord_user_id = ?', [userId], function (err) {
            if (err) {
                console.error('Database error while unblacklisting:', err.message);
                interaction.reply({ content: '❌ Fehler beim Entfernen aus der Blacklist.', ephemeral: true });
                return;
            }
            if (this.changes === 0) {
                interaction.reply({ content: `⚠️ Nutzer \`${userId}\` war nicht auf der Blacklist.`, ephemeral: true });
            } else {
                interaction.reply({ content: `✅ Nutzer \`${userId}\` wurde von der Blacklist entfernt.`, ephemeral: true });
            }
        });
    }
}; 