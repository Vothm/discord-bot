const Discord = require('discord.js');


module.exports = {
    name: 'now',
    description: 'Check playing of audio',
    execute(message) {

        const serverQueue = message.client.queue.get(message.guild.id);
        if (serverQueue) {
            const recievedEmbed = message.embeds[0];
            var currentMusic = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setTitle('Now playing:')
            message.channel.send(currentMusic).then(react => {
                react.react('⏭️');
            })
        }

    }
}