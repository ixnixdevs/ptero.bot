const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { db } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveawayclaim')
        .setDescription('Beanspruche deinen Gewinn aus einem Giveaway und wähle einen Server aus'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        // Check if user is winner and not claimed
        db.get('SELECT gp.giveaway_id, g.name FROM giveaway_participants gp \
            JOIN giveaways g ON gp.giveaway_id = g.id \
            WHERE gp.discord_user_id = ? AND gp.claimed = 0', [userId], async (err, row) => {
            if (err) {
                console.error('Database error checking giveaway claim:', err.message);
                await interaction.reply({ content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.', ephemeral: true });
                return;
            }
            if (!row) {
                await interaction.reply({ content: '⚠️ Du hast keinen Gewinn zum Beanspruchen oder hast bereits beansprucht.', ephemeral: true });
                return;
            }
            // Mark as claimed
            db.run('UPDATE giveaway_participants SET claimed = 1 WHERE giveaway_id = ? AND discord_user_id = ?', [row.giveaway_id, userId], (updateErr) => {
                if (updateErr) {
                    console.error('Failed to mark giveaway claim:', updateErr.message);
                }
            });
            // Increase user's max_server_limit by 1
            try {
                const userRow = await new Promise((resolve, reject) => {
                    db.get('SELECT max_server_limit FROM user_registrations WHERE discord_user_id = ? AND guild_id = ?', [userId, guildId], (err, row) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(row);
                        }
                    });
                });
                if (userRow) {
                    const newLimit = (userRow.max_server_limit || 1) + 1;
                    await new Promise((resolve, reject) => {
                        db.run('UPDATE user_registrations SET max_server_limit = ? WHERE discord_user_id = ? AND guild_id = ?', [newLimit, userId, guildId], (updateErr) => {
                            if (updateErr) {
                                reject(updateErr);
                            } else {
                                resolve();
                            }
                        });
                    });
                }
            } catch (error) {
                console.error('Error updating max_server_limit:', error);
            }
            // Show server selection buttons (reuse from /shop command)
            const pythonButton = new ButtonBuilder()
                .setCustomId('select_server_15')
                .setLabel('Python Server')
                .setStyle(ButtonStyle.Primary);
            const nodeButton = new ButtonBuilder()
                .setCustomId('select_server_18')
                .setLabel('Node.js Server')
                .setStyle(ButtonStyle.Primary);
            const javaButton = new ButtonBuilder()
                .setCustomId('select_server_16')
                .setLabel('Java Server')
                .setStyle(ButtonStyle.Primary);
            const serverSelectionRow = new ActionRowBuilder().addComponents(pythonButton, nodeButton, javaButton);
            await interaction.reply({
                content: '🎉 Du hast das Giveaway gewonnen! Wähle nun deinen Server aus:',
                components: [serverSelectionRow],
                ephemeral: true
            });
        });
    }
};
