module.exports = {
	name: 'stop',
    description: 'Stop all songs in the queue',
	execute(message) {
        const serverQueue = message.client.queue.get(message.guild.id);
        if(!message.guild.me.voice.channel) return message.channel.send('Yo I\'m not even there');
        if(serverQueue){
            if (!message.member.voice.channel) return message.channel.send('Can\'t really stop it if you\'re not here :/');
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end();
        } else {
            return message.channel.send('Nothing is playing right now');
        } 
	}
};