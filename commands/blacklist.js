const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../database');
const { ADMIN_ROLE_IDS } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Blacklist a Discord user ID to prevent registration')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord user ID to blacklist')
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
        db.get('SELECT * FROM user_blacklist WHERE discord_user_id = ?', [userId], async (err, row) => {
            if (err) {
                console.error('Database error while blacklisting:', err.message);
                await interaction.reply({ content: '❌ Fehler beim Zugriff auf die Datenbank.', ephemeral: true });
                return;
            }
            if (row) {
                await interaction.reply({ content: `⚠️ Nutzer \`${userId}\` ist bereits auf der Blacklist.`, ephemeral: true });
            } else {
                db.run('INSERT INTO user_blacklist (discord_user_id) VALUES (?)', [userId], async (insertErr) => {
                    if (insertErr) {
                        console.error('Error inserting into blacklist:', insertErr.message);
                        await interaction.reply({ content: '❌ Fehler beim Hinzufügen zur Blacklist.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: `✅ Nutzer \`${userId}\` wurde zur Blacklist hinzugefügt.`, ephemeral: true });
                    }
                });
            }
        });
    }
}; 