const ytdl = require('ytdl-core');
const ytlist = require('youtube-playlist');
const Discord = require('discord.js');

module.exports = {
	name: 'play',
	description: 'Play a song in your channel!',
	async execute(message) {
		try {
			const queue = message.client.queue;
			const args = message.content.split(' ');
			let validate = ytdl.validateURL(args[1]);
			if (!args[1]) return message.channel.send("??? There's no link brother");
			if (!validate) return message.channel.send("That's not even a proper link bro");
			const serverQueue = message.client.queue.get(message.guild.id);

			const voiceChannel = message.member.voice.channel;

			console.log(`voiceChannel: ${voiceChannel}`);
			if (!voiceChannel) return message.channel.send("You're not even in a channel dude");
			const permissions = voiceChannel.permissionsFor(message.client.user);
			if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
				return message.channel.send('I need the permissions to join and speak in your voice channel!');
			}

			const songInfo = await ytdl.getInfo(args[1]);
			const song = {
				title: songInfo.videoDetails.title,
				url: songInfo.videoDetails.video_url
			};

			if (!serverQueue) {
				const queueContruct = {
					textChannel: message.channel,
					voiceChannel: voiceChannel,
					connection: null,
					songs: [],
					volume: 5,
					playing: true
				};
				try {
					await ytlist(args[1], [ 'name', 'url' ])
						.then((res) => {
							return res.data.playlist;
						})
						.then((arr) => {
							for (let i = 0; i < arr.length; i++) {
								var playlist = {
									title: arr[i].name,
									url: arr[i].url
								};
								console.log(`${playlist.title} - ${playlist.url}`);
								queueContruct.songs.push(playlist);
							}
							queue.set(message.guild.id, queueContruct);
							message.channel.send(`**Added ${arr.length} tracks**`);
						});
				} catch (error) {
					let info = await ytdl.getInfo(args[1]);
					let song = {
						title: info.videoDetails.title,
						url: info.videoDetails.video_url
					};
					console.log(`Pushing song: ${song.title}\n${song.url}`);
					queue.set(message.guild.id, queueContruct);
					queueContruct.songs.push(song);
				}
				try {
					var connection = await voiceChannel.join();
					queueContruct.connection = connection;
					this.play(message, queueContruct.songs[0]);
				} catch (err) {
					console.log(err);
					queue.delete(message.guild.id);
					return message.channel.send(err);
				}
			} else {
				try {
					await ytlist(args[1], [ 'name', 'url' ])
						.then((res) => {
							return res.data.playlist;
						})
						.then((arr) => {
							for (let i = 0; i < arr.length; i++) {
								let songFromPlaylist = {
									title: arr[i].name,
									url: arr[i].url
								};
								serverQueue.songs.push(songFromPlaylist);
							}
							message.channel.send(`**Added ${arr.length} items to the queue**`);
						});
				} catch (error) {
					serverQueue.songs.push(song);
					message.channel.send(`**Added ${song.title} to the queue**`);
				}
			}
		} catch (error) {
			console.log(error);
			message.channel.send(error.message);
		}
	},

	async play(message, song) {
		const queue = message.client.queue;
		const guild = message.guild;
		const serverQueue = queue.get(message.guild.id);

		if (!song) {
			message.channel.send('There are no more songs in the queue');
			serverQueue.voiceChannel.leave();
			queue.delete(guild.id);
			return;
		}

		try {
			if (serverQueue) {
				let info = await ytdl.getInfo(serverQueue.songs[0].url);
				let recievedEmbed = message.embeds[0];
				let currentMusic = new Discord.MessageEmbed(recievedEmbed)
					.setColor('#FF0000')
					.setTitle(`Now playing: ${info.videoDetails.title}`)
					.setURL(info.videoDetails.video_url)
					//.setDescription(info.videoDetails.shortDescription)
					.setThumbnail(`https://img.youtube.com/vi/${info.videoDetails.videoId}/maxresdefault.jpg`)
					.setFooter(
						`${info.videoDetails.title}\n${serverQueue.songs.length - 1} songs left`,
						`https://img.youtube.com/vi/${info.videoDetails.videoId}/maxresdefault.jpg`
					)
					.setImage(`https://img.youtube.com/vi/${info.videoDetails.videoId}/maxresdefault.jpg`);

				const filter = (reaction, user) => {
					return [ '⏭️', '⏯️' ].includes(reaction.emoji.name) && user.id === message.author.id;
				};
				message.channel.send({ embed: currentMusic }).then(async (react) => {
					Promise.all([ react.react('⏭️'), react.react('⏯️') ]).catch(() =>
						console.error('One of the emojis failed to react.')
					);

					const dispatcher = serverQueue.connection
						.play(ytdl(song.url, { quality: 'highestaudio', filter: 'audioonly', highWaterMark: 1 << 25 }))
						.on('finish', () => {
							serverQueue.songs.shift();
							//message.channel.delete({ embed: currentMusic });
							this.play(message, serverQueue.songs[0]);
							react.delete({ timeout: 500 });
							dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
						})
						.on('error', (error) => console.error(error));

					// Useful only if you know how many reactions you want
					// react.awaitReactions(filter, { max: 1 }).then(async collected => {
					//     const reaction = collected.first();
					//     if (reaction.emoji.name === '⏭️') {
					//         serverQueue.songs.shift();
					//         react.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
					//         react.delete({ timeout: 500 });
					//         this.play(message, serverQueue.songs[0]);
					//     }
					// }).catch(collected => {
					//     console.log('Idk what happened ' + collected);
					// });

					const collector = react.createReactionCollector(filter);
					collector.on('collect', async (reaction, user) => {
						let userId = message.author.id;

						if (reaction.emoji.name === '⏭️') {
							//message.channel.send('Skipping');
							serverQueue.songs.shift();
							react.delete({ timeout: 500 });
							this.play(message, serverQueue.songs[0]);
						}

						if (reaction.emoji.name === '⏯️') {
							const userReactions = react.reactions.cache.filter((rec) => rec.users.cache.has(userId));
							try {
								for (const rec of userReactions.values()) {
									await rec.users.remove(userId);
								}
							} catch (error) {
								console.error('Failed to remove');
							}

							if (dispatcher.paused) {
								//message.channel.send('Resuming');
								dispatcher.resume();
							} else {
								dispatcher.pause();
							}
						}
					});
				});
			} else {
				message.channel.send('Nothing else in the queue');
			}
		} catch (err) {
			message.channel.send('You fucked up');
		}
	}
};
