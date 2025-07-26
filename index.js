const {
    Client, GatewayIntentBits, Partials,
    Events, Routes, REST
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, BOT_STATUS } = require('./config');
const { db } = require('./database');
const { logInfo, logError } = require('./utils/logger');

// === SLASH-COMMANDS LADEN ===
const commands = [];
const commandHandlers = new Map();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command.data && command.execute) {
        commands.push(command.data.toJSON());
        commandHandlers.set(command.data.name, command);
    }
}

// === SLASH-COMMANDS REGISTRIEREN ===
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        logInfo('📡 Registriere Slash-Commands...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        logInfo('✅ Slash-Commands registriert!');
    } catch (error) {
        logError('❌ Fehler beim Registrieren der Commands:', error);
    }
})();

// === DISCORD CLIENT INITIALISIEREN ===
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

client.once(Events.ClientReady, () => {
    logInfo(`🤖 Bot ist online als ${client.user.tag}`);
    try {
        client.user.setPresence({ status: BOT_STATUS });
    } catch (error) {
        logError('❌ Fehler beim Setzen des Status:', error);
    }
});

// === INTERACTION HANDLER ===
client.on(Events.InteractionCreate, async interaction => {
    let commandName = interaction.commandName;

    // === BUTTON INTERAKTION ===
    if (!commandName && interaction.isButton()) {
        if (interaction.customId.startsWith('register')) commandName = 'register';
        else if (interaction.customId.startsWith('select_server_')) commandName = 'shop';
    }

    // === MODAL INTERAKTION ===
    if (!commandName && interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('register_modal')) commandName = 'register';
        else if (interaction.customId.startsWith('link_modal')) commandName = 'link';
    }

    const command = commandHandlers.get(commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        logError(`❌ Fehler im Command "${commandName}":`, error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ Beim Ausführen des Befehls ist ein Fehler aufgetreten.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ Beim Ausführen des Befehls ist ein Fehler aufgetreten.',
                    ephemeral: true
                });
            }
        } catch (err) {
            logError('❌ Fehler beim Senden der Fehlerantwort:', err);
        }
    }
});

client.login(DISCORD_TOKEN);