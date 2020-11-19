const Discord = require('discord.js');
const ytdl = require('ytdl-core-discord');

module.exports = {
	name: 'now',
	description: 'Check playing of audio',
	async execute(message) {
		let serverQueue = message.client.queue.get(message.guild.id);
		const recievedEmbed = message.embeds[0];

		if (serverQueue) {
			try {
				return new Promise(async (resolve, reject) => {
					await ytdl.getInfo(serverQueue.songs[0].url).then((res) => {
						const songInfo = {
							title: res.player_response.videoDetails.title,
							url: res.video_url,
							shortDescription: truncateString(res.description, 200),
							id: res.video_id,
							author: res.author.name
						};

						const currentMusic = new Discord.MessageEmbed(recievedEmbed)
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
				});
			} catch (error) {
				console.log('Could not get song info ' + error);
			}
		} else {
			message.channel.send('Nothing is in the queue right now');
		}

		function truncateString(str, num) {
			if (str.length <= num) return str;
			else return str.slice(0, num) + '...';
		}
	}
};

module.exports = {
    name: 'now',
    description: 'Check playing of audio',
    async execute(message) {

        let serverQueue = message.client.queue.get(message.guild.id);
        const recievedEmbed = message.embeds[0];

        if (serverQueue) {
            try {
                return new Promise(async (resolve, reject) => {
                    await ytdl.getInfo(serverQueue.songs[0].url).then(res => {
                        const songInfo = {
                            title: res.player_response.videoDetails.title,
                            url: res.video_url,
                            shortDescription: truncateString(res.description, 200),
                            id: res.video_id,
                            author: res.author.name,
                        };

                        const currentMusic = new Discord.MessageEmbed(recievedEmbed)
                            .setColor('#FF0000')
                            .setTitle(`Now playing: ${songInfo.title}`)
                            .setURL(songInfo.url)
                            .setDescription(songInfo.shortDescription)
                            .setThumbnail(`https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`)
                            .setFooter(`${songInfo.title}\n${serverQueue.songs.length - 1} songs left`, `https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`)
                            .setImage(`https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`)
                            .setAuthor(songInfo.author)


                        // message.channel.send({ embed: currentMusic }).then(react => {
                        //     Promise.all([
                        //         react.react('⏭️'),
                        //         react.react('⏯️'),
                        //     ])
                        // });
                        //serverQueue.on('')
                        resolve(currentMusic);
                    })
                })
            } catch (error) {
                console.log('Could not get song info ' + error);
            }

        } else {
            message.channel.send('Nothing is in the queue right now');
        }

        function truncateString(str, num) {
            if (str.length <= num)
                return str
            else return str.slice(0, num) + '...'
        }
    }
}
