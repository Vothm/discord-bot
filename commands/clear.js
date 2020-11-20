module.exports = {
	name: 'clear',
	description: 'Use this command to clear the music queue',

	execute(message) {
		const voiceChannel = message.member.voice.channel;
		message.channel.send('Clearing songs');
		if (!voiceChannel) return message.channel.send("Yo I'm not even there");
		if (!voiceChannel) return message.channel.send("You're not even in a channel dude");

		const queue = message.client.queue;
		if (queue) {
			return queue.delete(message.guild.me.voice.channel.id);
		} else {
			message.channel.send('There are no songs to clear');
		}
	}
};
