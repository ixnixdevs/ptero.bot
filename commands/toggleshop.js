const { SlashCommandBuilder } = require('discord.js');
const { isShopEnabled, setShopEnabled, db } = require('../database');
const { ADMIN_ROLE_IDS } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggleshop')
        .setDescription('Toggle the availability of the /shop command'),
    async execute(interaction) {
        const member = interaction.member;
        const hasAdminRole = member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
        if (!hasAdminRole) {
            await interaction.reply({
                content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.',
                ephemeral: true
            });
            return;
        }
        const currentState = await isShopEnabled();
        const newState = !currentState;
        try {
            await setShopEnabled(newState);
            await interaction.reply({
                content: `✅ Der Shop wurde ${newState ? 'aktiviert' : 'deaktiviert'}.`,
                ephemeral: true
            });
        } catch (err) {
            console.error('Failed to toggle shop state:', err);
            await interaction.reply({
                content: '❌ Fehler beim Umschalten des Shops. Bitte versuche es später erneut.',
                ephemeral: true
            });
        }
    }
}; 