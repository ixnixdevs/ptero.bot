const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../database');
const { ADMIN_ROLE_IDS, API_URL_SERVER_CREATE, API_URL_ALLOCATIONS, API_URL_USER_FETCH, API_KEY, SERVER_ENVIRONMENT, SERVER_LIMITS, SERVER_FEATURE_LIMITS, LOG_CHANNEL_ID, PANEL_DOMAIN } = require('../config');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminassignserver')
        .setDescription('Weist einem Benutzer basierend auf der User-ID einen Server zu und legt eine Ablaufzeit fest')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Die Discord User ID des Benutzers')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('eggid')
                .setDescription('Die Egg ID des Servers')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('expiration')
                .setDescription('Ablaufzeit in Tagen, nach der der Server gesperrt wird')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('disk')
                .setDescription('Festplattenplatz in MB')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('ram')
                .setDescription('RAM in MB')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('cpu')
                .setDescription('CPU in Prozent')
                .setRequired(false)
        ),
    async execute(interaction) {
        // Check admin role
        const member = interaction.member;
        if (!member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id))) {
            await interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
            return;
        }

        const userId = interaction.options.getString('userid');
        const eggId = interaction.options.getString('eggid');
        const expirationDays = interaction.options.getInteger('expiration') || null;

        // Validate user exists in database
        db.get('SELECT * FROM user_registrations WHERE discord_user_id = ?', [userId], async (err, userRow) => {
            if (err) {
                console.error('Database error:', err.message);
                await interaction.reply({ content: '❌ Ein Fehler ist aufgetreten.', ephemeral: true });
                return;
            }
            if (!userRow) {
                await interaction.reply({ content: `⚠️ Kein Benutzer mit der Discord-ID ${userId} gefunden.`, ephemeral: true });
                return;
            }

            // Fetch egg details from Pterodactyl API by fetching nests and eggs per nest
            let eggDetails = null;
            try {
                // Fetch nests
                const nestsResponse = await axios.get(`${PANEL_DOMAIN}api/application/nests`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/vnd.pterodactyl.v1+json',
                        'Content-Type': 'application/json'
                    }
                });
                const nests = nestsResponse.data.data;

                // Fetch eggs for all nests
                let allEggs = [];
                for (const nest of nests) {
                    const nestId = nest.attributes.id;
                    const eggsResponse = await axios.get(`${PANEL_DOMAIN}api/application/nests/${nestId}/eggs`, {
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    allEggs = allEggs.concat(eggsResponse.data.data);
                }

                eggDetails = allEggs.find(egg => egg.attributes.id.toString() === eggId);
                if (!eggDetails) {
                    await interaction.reply({ content: `❌ Egg mit ID ${eggId} nicht gefunden.`, ephemeral: true });
                    return;
                }
            } catch (apiError) {
                console.error('Pterodactyl API error:', apiError.message);
                await interaction.reply({ content: '❌ Fehler beim Abrufen der Egg-Daten.', ephemeral: true });
                return;
            }

            // Extract docker image and startup command from egg details
            const dockerImage = eggDetails.attributes.docker_image || '';
            const startup = eggDetails.attributes.startup || '';

            // Fetch allocations
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
                console.error('Fehler beim Abrufen der Allocations:', allocError.message);
                await interaction.reply({
                    content: '❌ Fehler beim Abrufen der Allocations. Bitte versuche es später erneut.',
                    ephemeral: true
                });
                return;
            }

            // Prepare environment variables with defaults from egg variables
            let envVars = { ...SERVER_ENVIRONMENT };
            if (eggDetails.attributes.variables && Array.isArray(eggDetails.attributes.variables)) {
                for (const variable of eggDetails.attributes.variables) {
                    if (variable.attributes.required && variable.attributes.default_value) {
                        if (!(variable.attributes.env_variable in envVars)) {
                            envVars[variable.attributes.env_variable] = variable.attributes.default_value;
                        }
                    }
                }
            }

            // Debug log environment variables before sending
            console.log('Final environment variables for server creation:', envVars);

            // Override limits with provided options if any
            const disk = interaction.options.getInteger('disk');
            const ram = interaction.options.getInteger('ram');
            const cpu = interaction.options.getInteger('cpu');

            const limits = { ...SERVER_LIMITS };
            if (disk !== null) limits.disk = disk;
            if (ram !== null) limits.memory = ram;
            if (cpu !== null) limits.cpu = cpu;

            // Create server data
            const serverData = {
                name: `${userRow.username}'s Server`,
                user: Number(userRow.pelican_user_id),
                egg: Number(eggId),
                docker_image: eggDetails.attributes.docker_image,
                startup: startup,
                environment: Object.fromEntries(
                    Object.entries(envVars).map(([key, value]) => [key, String(value)])
                ),
                limits: limits,
                feature_limits: SERVER_FEATURE_LIMITS,
                allocation: {
                    default: allocationId
                }
            };

            // Create server via API
            try {
                const response = await axios.post(API_URL_SERVER_CREATE, serverData, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/vnd.pterodactyl.v1+json',
                        'Content-Type': 'application/json'
                    }
                });
                const serverId = response.data.attributes.id;

                // Insert server assignment with expiration into database
                const expirationTimestamp = expirationDays ? Date.now() + expirationDays * 24 * 60 * 60 * 1000 : null;
                db.run('INSERT INTO user_servers (discord_user_id, server_id, egg_id, expiration) VALUES (?, ?, ?, ?)', [userId, serverId, eggId, expirationTimestamp], (dbErr) => {
                    if (dbErr) {
                        console.error('Failed to save server assignment:', dbErr.message);
                    }
                });

                console.log('Server creation payload response:', JSON.stringify(response.data, null, 2));
                await interaction.reply({
                    content: `✅ Server erfolgreich erstellt und zugewiesen! Server ID: ${serverId}. Ablaufzeit: ${expirationDays ? expirationDays + ' Tage' : 'Keine'}.`,
                    ephemeral: true
                });

                const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
                if (logChannel && logChannel.isTextBased()) {
                    await logChannel.send({
                        content: `🛠️ **Server erstellt und zugewiesen:**\n` +
                            `👤 Discord: ${interaction.user.tag} (\`${interaction.user.id}\`)\n` +
                            `🖥️ Servername: \`${userRow.username}'s Server\`\n` +
                            `🥚 Egg ID: ${eggId}\n` +
                            `🆔 Server ID: ${serverId}\n` +
                            `⏳ Ablaufzeit: ${expirationDays ? expirationDays + ' Tage' : 'Keine'}`
                    });
                }
            } catch (apiError) {
                console.error('API error:', apiError.message);
                console.error('Server creation error details:', apiError.response?.data ? JSON.stringify(apiError.response.data, null, 2) : apiError.message);
                await interaction.reply({
                    content: `❌ Servererstellung fehlgeschlagen. Bitte versuche es später erneut.`,
                    ephemeral: true
                });
            }
        });
    }
};
