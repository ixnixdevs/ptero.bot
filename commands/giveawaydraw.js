const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../database');
const { ADMIN_ROLE_IDS, LOG_CHANNEL_ID } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveawaydraw')
        .setDescription('Ziehe Gewinner aus dem aktuellen Giveaway (Admin)')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Anzahl der Gewinner')
                .setRequired(true)),
    async execute(interaction, client) {
        const member = interaction.member;
        const hasAdminRole = member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
        if (!hasAdminRole) {
            await interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
            return;
        }
        const count = interaction.options.getInteger('count');
        const guildId = interaction.guildId;

        // Get active giveaway
        db.get('SELECT * FROM giveaways WHERE guild_id = ? AND is_active = 1', [guildId], (err, giveaway) => {
            if (err) {
                console.error('Failed to fetch active giveaway:', err.message);
                interaction.reply({ content: '❌ Fehler beim Abrufen des Giveaways.', ephemeral: true });
                return;
            }
            if (!giveaway) {
                interaction.reply({ content: '⚠️ Es gibt kein aktives Giveaway.', ephemeral: true });
                return;
            }
            // Get participants
            db.all('SELECT discord_user_id FROM giveaway_participants WHERE giveaway_id = ?', [giveaway.id], async (err2, participants) => {
                if (err2) {
                    console.error('Failed to fetch giveaway participants:', err2.message);
                    interaction.reply({ content: '❌ Fehler beim Abrufen der Teilnehmer.', ephemeral: true });
                    return;
                }
                if (participants.length === 0) {
                    interaction.reply({ content: '⚠️ Es sind keine Teilnehmer im Giveaway.', ephemeral: true });
                    return;
                }
                // Shuffle and pick winners
                const shuffled = participants.sort(() => 0.5 - Math.random());
                const winners = shuffled.slice(0, count);
                // Mark giveaway inactive
                db.run('UPDATE giveaways SET is_active = 0 WHERE id = ?', [giveaway.id], (err3) => {
                    if (err3) {
                        console.error('Failed to deactivate giveaway:', err3.message);
                    }
                });
                // Notify winners and admin
                const winnerMentions = winners.map(w => `<@${w.discord_user_id}>`).join(', ');
                await interaction.reply({ content: `🎉 Die Gewinner des Giveaways "${giveaway.name}" sind: ${winnerMentions}`, ephemeral: false });
                // Log winners
                const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
                if (logChannel && logChannel.isTextBased()) {
                    await logChannel.send({ content: `🎉 **Giveaway "${giveaway.name}" Gewinner:**\n${winnerMentions}` });
                }
            });
        });
    }
};
