
module.exports = {
    name: 'clear',
    description: 'Use this command to clear the music queue',

    execute(message) {
        const voiceChannel = message.member.voice.channel;
        const serverQueue = message.client.queue.get(message.guild.id);
        message.channel.send('Clearing songs');
        if (!voiceChannel) return message.channel.send('Yo I\'m not even there');
        if (!voiceChannel) return message.channel.send("You\'re not even in a channel dude");

        if (serverQueue.songs.length > 0) {
            return serverQueue.songs.length = 0;
        } else {
            message.channel.send('There are no songs to clear');
        }
    }
}