const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const axios = require('axios');
const { db, isShopEnabled } = require('../database');
const { API_URL_USER_FETCH, API_KEY, API_URL_SERVER_FETCH, API_URL_ALLOCATIONS, API_URL_SERVER_CREATE, SERVER_ENVIRONMENT, SERVER_LIMITS, SERVER_FEATURE_LIMITS, LOG_CHANNEL_ID, PANEL_DOMAIN } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Wähle einen Server aus dem Shop aus'),
    async execute(interaction, client) {
        // /shop command
        if (interaction.isChatInputCommand()) {
            const enabled = await isShopEnabled();
            if (!enabled) {
                await interaction.reply({
                    content: '❌ Der Shop ist derzeit deaktiviert.',
                    ephemeral: true
                });
                return;
            }
            db.get('SELECT * FROM user_registrations WHERE discord_user_id = ? AND guild_id = ?', [interaction.user.id, interaction.guildId], async (err, userRow) => {
                if (err) {
                    console.error('Database error:', err.message);
                    await interaction.reply({
                        content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
                        ephemeral: true
                    });
                    return;
                }
                if (!userRow) {
                    await interaction.reply({
                        content: '⚠️ Du bist nicht registriert. Bitte registriere dich zuerst mit /register.',
                        ephemeral: true
                    });
                    return;
                }
                // Check if Pelican Panel user still exists
                try {
                    await axios.get(`${API_URL_USER_FETCH}/${userRow.pelican_user_id}`, {
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Accept': 'Application/vnd.pterodactyl.v1+json',
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (userError) {
                    if (userError.response && userError.response.status === 404) {
                        db.run('DELETE FROM user_registrations WHERE discord_user_id = ?', [interaction.user.id], (delErr) => {
                            if (delErr) {
                                console.error('Failed to remove non-existent user registration:', delErr.message);
                            }
                        });
                        db.run('DELETE FROM user_servers WHERE discord_user_id = ?', [interaction.user.id], (delErr) => {
                            if (delErr) {
                                console.error('Failed to remove server assignment for non-existent user:', delErr.message);
                            }
                        });
                        await interaction.reply({
                            content: '⚠️ Dein Benutzer existiert nicht mehr auf dem Panel. Bitte registriere dich erneut mit /register.',
                            ephemeral: true
                        });
                        return;
                    } else {
                        console.error('Error checking Pelican Panel user existence:', userError.message);
                        await interaction.reply({
                            content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
                            ephemeral: true
                        });
                        return;
                    }
                }
                // Check how many servers user has assigned and clean up non-existent servers
                db.all('SELECT * FROM user_servers WHERE discord_user_id = ?', [interaction.user.id], async (err2, servers) => {
                    if (err2) {
                        console.error('Database error:', err2.message);
                        await interaction.reply({
                            content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
                            ephemeral: true
                        });
                        return;
                    }
                    // Filter servers that exist on Pelican Panel
                    const validServers = [];
                    for (const serverRow of servers) {
                        try {
                            await axios.get(`${API_URL_SERVER_FETCH}/${serverRow.server_id}`, {
                                headers: {
                                    'Authorization': `Bearer ${API_KEY}`,
                                    'Accept': 'application/vnd.pterodactyl.v1+json',
                                    'Content-Type': 'application/json'
                                }
                            });
                            validServers.push(serverRow);
                        } catch (error) {
                            if (error.response && error.response.status === 404) {
                                db.run('DELETE FROM user_servers WHERE server_id = ?', [serverRow.server_id], (delErr) => {
                                    if (delErr) {
                                        console.error('Failed to remove non-existent server assignment:', delErr.message);
                                    }
                                });
                            } else {
                                console.error('Error checking server existence:', error.message);
                                try {
                                    await interaction.reply({
                                        content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
                                        ephemeral: true
                                    });
                                } catch (replyErr) {
                                    console.error('Failed to send error reply:', replyErr.message);
                                }
                                return;
                            }
                        }
                    }
                    // Check if user has reached max server limit
                    if (validServers.length >= userRow.max_server_limit) {
                        await interaction.reply({
                            content: `⚠️ Du hast bereits die maximale Anzahl von ${userRow.max_server_limit} Servern erreicht.`,
                            ephemeral: true
                        });
                        return;
                    }
                    // Show server selection buttons dynamically from config
                    const { SHOP_BUTTONS } = require('../config');
                    const buttons = SHOP_BUTTONS.map(buttonConfig => {
                        return new ButtonBuilder()
                            .setCustomId(`select_server_${buttonConfig.eggId}`)
                            .setLabel(buttonConfig.label)
                            .setStyle(ButtonStyle[buttonConfig.style] || ButtonStyle.Primary);
                    });
                    const row = new ActionRowBuilder().addComponents(buttons);
                    await interaction.reply({
                        content: 'Wähle einen Server aus dem Shop aus:',
                        components: [row],
                        ephemeral: true
                    });
                });
            });
        }
        // Button clicked → process server selection
        else if (interaction.isButton() && interaction.customId.startsWith('select_server_')) {
            const eggId = parseInt(interaction.customId.split('_')[2]);
            db.all('SELECT * FROM user_servers WHERE discord_user_id = ?', [interaction.user.id], async (err, servers) => {
                if (err) {
                    console.error('Database error:', err.message);
                    await interaction.reply({
                        content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
                        ephemeral: true
                    });
                    return;
                }
                db.get('SELECT * FROM user_registrations WHERE discord_user_id = ? AND guild_id = ?', [interaction.user.id, interaction.guildId], async (err2, userRow) => {
                    if (err2 || !userRow) {
                        await interaction.reply({
                            content: '❌ Registrierung nicht gefunden. Bitte registriere dich zuerst mit /register.',
                            ephemeral: true
                        });
                        return;
                    }
                    // Check if user has reached max server limit
                    if (servers.length >= userRow.max_server_limit) {
                        await interaction.reply({
                            content: `⚠️ Du hast bereits die maximale Anzahl von ${userRow.max_server_limit} Servern erreicht.`,
                            ephemeral: true
                        });
                        return;
                    }
                    // Fetch allocations from Pelican Panel API
                    let allocationId = null;
                    try {
                        const allocationsResponse = await axios.get(API_URL_ALLOCATIONS, {
                            headers: {
                                'Authorization': `Bearer ${API_KEY}`,
                                'Accept': 'application/vnd.pterodactyl.v1+json',
                                'Content-Type': 'application/json'
                            }
                        });
                        const allocations = allocationsResponse.data.data;
                        const freeAllocation = allocations.find(a => !a.attributes.assigned);
                        if (freeAllocation) {
                            allocationId = freeAllocation.attributes.id;
                        } else {
                            await interaction.reply({
                                content: '❌ Keine freien Allocations verfügbar. Bitte versuche es später erneut.',
                                ephemeral: true
                            });
                            return;
                        }
                    } catch (allocError) {
                        console.error('Fehler beim Abrufen der Allocations:', allocError.response?.data || allocError.message);
                        await interaction.reply({
                            content: '❌ Fehler beim Abrufen der Allocations. Bitte versuche es später erneut.',
                            ephemeral: true
                        });
                        return;
                    }
                    // Create server via Pelican Panel API with dockerImage from config
                    const { SHOP_BUTTONS } = require('../config');
                    const selectedButton = SHOP_BUTTONS.find(b => b.eggId === eggId);
                    if (!selectedButton) {
                        await interaction.reply({
                            content: '❌ Ungültige Serverauswahl.',
                            ephemeral: true
                        });
                        return;
                    }
                    const serverData = {
                        name: `${userRow.username}'s Server`,
                        user: Number(userRow.pelican_user_id),
                        egg: eggId,
                        docker_image: selectedButton.dockerImage,
                        startup: selectedButton.startup,
                        environment: SERVER_ENVIRONMENT,
                        limits: SERVER_LIMITS,
                        feature_limits: SERVER_FEATURE_LIMITS,
                        allocation: {
                            default: allocationId
                        }
                    };
                    try {
                        const response = await axios.post(API_URL_SERVER_CREATE, serverData, {
                            headers: {
                                'Authorization': `Bearer ${API_KEY}`,
                                'Accept': 'application/vnd.pterodactyl.v1+json',
                                'Content-Type': 'application/json'
                            }
                        });
                        const serverId = response.data.attributes.id;
                        db.run('INSERT INTO user_servers (discord_user_id, server_id, egg_id) VALUES (?, ?, ?)', [interaction.user.id, serverId, eggId], (dbErr) => {
                            if (dbErr) {
                                console.error('Failed to save server assignment:', dbErr.message);
                            }
                        });
                        await interaction.reply({
                            content: `✅ Server erfolgreich erstellt! Du hast den Server mit Egg ID ${eggId} ausgewählt.`,
                            ephemeral: true
                        });
                        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
                        if (logChannel && logChannel.isTextBased()) {
                            await logChannel.send({
                                content: `🛠️ **Server erstellt:**\n` +
                                    `👤 Discord: ${interaction.user.tag} (\`${interaction.user.id}\`)\n` +
                                    `🖥️ Servername: \`${userRow.username}'s Server\`\n` +
                                    `🥚 Egg ID: ${eggId}\n` +
                                    `🆔 Server ID: ${serverId}`
                            });
                        }
                    } catch (apiError) {
                        console.error('API error:', apiError.response?.data || apiError.message);
                        await interaction.reply({
                            content: '❌ Servererstellung fehlgeschlagen. Bitte versuche es später erneut.',
                            ephemeral: true
                        });
                    }
                });
            });
        }
    }
};
