module.exports = {
    name: "skip",
    description: "Skip current song",
    execute(message) {

        const serverQueue = message.client.queue.get(message.guild.id);
        if (!message.guild.me.voice.channel) return message.channel.send('I\'m not there');
        if (!message.member.voice.channel)
            return message.channel.send('Can\'t really stop if you\'re not connected :/');
        if (!serverQueue)
            return message.channel.send('There no song to skip tho...');
        serverQueue.connection.dispatcher.emit('finish');
    }
};