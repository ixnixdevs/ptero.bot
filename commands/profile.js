const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../database');
const { PANEL_DOMAIN } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Send your account details and created servers via DM'),
    async execute(interaction) {
        const userId = interaction.user.id;
        db.get('SELECT * FROM user_registrations WHERE discord_user_id = ?', [userId], async (err, userRow) => {
            if (err) {
                console.error('Database error fetching user profile:', err.message);
                await interaction.reply({ content: '❌ Fehler beim Abrufen deiner Profildaten.', ephemeral: true });
                return;
            }
            if (!userRow) {
                await interaction.reply({ content: '⚠️ Du bist nicht registriert.', ephemeral: true });
                return;
            }
            db.all('SELECT * FROM user_servers WHERE discord_user_id = ?', [userId], async (err2, servers) => {
                if (err2) {
                    console.error('Database error fetching user servers:', err2.message);
                    await interaction.reply({ content: '❌ Fehler beim Abrufen deiner Serverdaten.', ephemeral: true });
                    return;
                }
                let serverList = 'Keine Server gefunden.';
                if (servers.length > 0) {
                    serverList = servers.map(s => `• Server ID: ${s.server_id}, Egg ID: ${s.egg_id}, URL: ${PANEL_DOMAIN}/server/${s.server_id}/console`).join('\n');
                }
                const profileMessage = `👤 **Dein Profil**\n` +
                    `Benutzername: ${userRow.username}\n` +
                    `E-Mail: ${userRow.email}\n\n` +
                    `**Deine Server:**\n${serverList}`;
                try {
                    await interaction.user.send(profileMessage);
                    await interaction.reply({ content: '✅ Ich habe dir deine Profildaten per DM gesendet.', ephemeral: true });
                } catch (dmError) {
                    console.error('Failed to send DM:', dmError.message);
                    await interaction.reply({ content: '❌ Ich konnte dir keine DM senden. Bitte aktiviere DMs von Servermitgliedern.', ephemeral: true });
                }
            });
        });
    }
}; 