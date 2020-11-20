const Discord = require('discord.js');
const ytdl = require('ytdl-core');

module.exports = {
	name: 'now',
	description: 'Check playing of audio',
	async execute(message) {
		const recievedEmbed = message.embeds[0];
		let currentMusic = new Discord.MessageEmbed().setColor('#FF0000').setTitle('Now playing:');
		message.channel.send(currentMusic).then((react) => {
			react.react('⏭️');
		});

		if (serverQueue) {
			try {
				return new Promise(async (resolve, reject) => {
					let info = await ytdl.getInfo(serverQueue.songs[0].url);
					const songInfo = {
						title: info.player_response.videoDetails.title,
						url: info.video_url,
						shortDescription: truncateString(info.description, 200),
						id: info.video_id,
						author: info.author.name
					};

					currentMusic = new Discord.MessageEmbed(recievedEmbed)
						.setColor('#FF0000')
						.setTitle(`Now playing: ${songInfo.title}`)
						.setURL(songInfo.url)
						.setDescription(songInfo.shortDescription)
						.setThumbnail(`https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`)
						.setFooter(
							`${songInfo.title}\n${serverQueue.songs.length - 1} songs left`,
							`https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`
						)
						.setImage(`https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`)
						.setAuthor(songInfo.author);

					// message.channel.send({ embed: currentMusic }).then(react => {
					//     Promise.all([
					//         react.react('⏭️'),
					//         react.react('⏯️'),
					//     ])
					// });
					//serverQueue.on('')
					resolve(currentMusic);
				});
			} catch (error) {
				console.log('Could not get song info ' + error);
			}
		} else {
			message.channel.send('Nothing is in the queue right now');
		}
	}
};
