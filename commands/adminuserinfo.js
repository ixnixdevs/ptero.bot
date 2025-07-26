const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../database');
const { ADMIN_ROLE_IDS, API_URL_USER_FETCH, API_KEY } = require('../config');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminuserinfo')
        .setDescription('Liest Benutzerinformationen aus der Datenbank und Pterodactyl API anhand der Discord-ID aus')
        .addStringOption(option =>
            option.setName('discordid')
                .setDescription('Die Discord-ID des Benutzers')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Check if user has admin role
        const member = interaction.member;
        if (!member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id))) {
            await interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
            return;
        }

        const discordId = interaction.options.getString('discordid');

        db.get('SELECT * FROM user_registrations WHERE discord_user_id = ?', [discordId], async (err, row) => {
            if (err) {
                console.error('Database error:', err.message);
                interaction.reply({ content: '❌ Ein Fehler ist aufgetreten.', ephemeral: true });
                return;
            }
            if (!row) {
                interaction.reply({ content: `⚠️ Kein Benutzer mit der Discord-ID ${discordId} gefunden.`, ephemeral: true });
                return;
            }

            // Fetch user info from Pterodactyl API
            let apiUserInfo = null;
            try {
                const response = await axios.get(`${API_URL_USER_FETCH}/${row.pelican_user_id}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'Application/vnd.pterodactyl.v1+json',
                        'Content-Type': 'application/json'
                    }
                });
                apiUserInfo = response.data.attributes;
            } catch (apiError) {
                console.error('Pterodactyl API error:', apiError.message);
            }

            // Format user info for reply
            let userInfo = `
**Benutzerinformationen aus der Datenbank:**
- Discord ID: ${row.discord_user_id}
- Guild ID: ${row.guild_id}
- Pelican User ID: ${row.pelican_user_id}
- Username: ${row.username || 'N/A'}
- Max Server Limit: ${row.max_server_limit || 'N/A'}
            `;

            if (apiUserInfo) {
                userInfo += `
**Benutzerinformationen aus der Pterodactyl API:**
- Email: ${apiUserInfo.email || 'N/A'}
- Name: ${apiUserInfo.name || 'N/A'}
- Language: ${apiUserInfo.language || 'N/A'}
- Root Admin: ${apiUserInfo.root_admin ? 'Ja' : 'Nein'}
- Created At: ${apiUserInfo.created_at || 'N/A'}
- Updated At: ${apiUserInfo.updated_at || 'N/A'}
                `;
            } else {
                userInfo += '\n⚠️ Konnte keine Informationen von der Pterodactyl API abrufen.';
            }

            interaction.reply({ content: userInfo, ephemeral: true });
        });
    }
};
