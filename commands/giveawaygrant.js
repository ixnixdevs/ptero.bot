const { SlashCommandBuilder } = require('discord.js');
const { ADMIN_ROLE_IDS } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveawaygrant')
        .setDescription('Erstelle als Admin einen Giveaway-Server für einen Nutzer')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord User ID des Nutzers')
                .setRequired(true)),
    async execute(interaction) {
        const member = interaction.member;
        const hasAdminRole = member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
        if (!hasAdminRole) {
            await interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
            return;
        }
        const targetUserId = interaction.options.getString('userid');
        // Insert a giveaway server for the user (implementation depends on your server creation logic)
        // For now, just acknowledge the command
        await interaction.reply({ content: `✅ Giveaway-Server für Nutzer <@${targetUserId}> wurde erstellt (Platzhalter).`, ephemeral: true });
    }
};
