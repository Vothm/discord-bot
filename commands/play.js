const ytdl = require('ytdl-core');
const scrapePlaylist = require('youtube-playlist-scraper');
const Discord = require('discord.js');

module.exports = {
	name: 'play',
	description: 'Play a song in your channel!',
	async execute(message) {
		try {
			// Setup the queue and verify the link
			const queue = message.client.queue;
			const args = message.content.split(' ');
			//let validate = ytdl.validateURL(args[1]);
			const serverQueue = message.client.queue.get(message.guild.id);
			const voiceChannel = message.member.voice.channel;

			let videoId;
			if (!args[1]) return message.channel.send("There's no link brother");
			if (args[1].includes('radio')) {
				return message.channel.send("Sry, can't play YouTube mixes");
			}
			if (args[1].includes('playlist')) {
				console.log('Found playlist main page');
				videoId = args[1].split('list=')[1];
			} else if (args[1].includes('list=')) {
				console.log("Found a playlist that's playing");
				videoId = args[1].split('list=')[1];
			} else if (args[1].includes('v=')) {
				videoId = args[1].split('v=')[1];
			} else {
				message.channel.send('Not a link');
			}
			console.log(`voiceChannel: ${voiceChannel}`);
			if (!voiceChannel) return message.channel.send("You're not even in a channel dude");
			const permissions = voiceChannel.permissionsFor(message.client.user);
			if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
				return message.channel.send('I need the permissions to join and speak in your voice channel!');
			}

			if (!serverQueue) {
				const queueContract = {
					textChannel: message.channel,
					voiceChannel: voiceChannel,
					connection: null,
					songs: [],
					volume: 4,
					playing: true
				};
				try {
					// Get the playlist and add to the queue of songs
					let playlists = await this.getPlayList(videoId);
					for (let i = 0; i < playlists.length; i++) {
						let single = {
							title: playlists[i].name,
							url: playlists[i].url
						};
						console.log(`${single.title} - ${single.url}`);
						queueContract.songs.push(single);
					}
					queue.set(message.guild.id, queueContract);
					message.channel.send(`**Added ${playlists.length} tracks**`);
				} catch (error) {
					let songInfo = await ytdl.getInfo(args[1]);
					let song = {
						title: songInfo.videoDetails.title,
						url: songInfo.videoDetails.video_url
					};
					console.log(`Pushing song: ${song.title}\n${song.url}`);
					queueContract.songs.push(song);
					queue.set(message.guild.id, queueContract);
				}

				// Connect to the channel and start playing music
				try {
					let connection = await voiceChannel.join();
					queueContract.connection = connection;
					this.play(message, queueContract.songs[0]);
				} catch (err) {
					console.log(err);
					queue.delete(message.guild.id);
					return message.channel.send(err);
				}
			} else {
				try {
					// Try to get a playlist if it is a playlist
					let playlists = await this.getPlayList(videoId);
					for (let i = 0; i < playlists.length; i++) {
						let solo = {
							title: playlists[i].name,
							url: playlists[i].url
						};
						console.log(`${solo.title} - ${solo.url}`);
						serverQueue.songs.push(solo);
					}
					message.channel.send(`**Added ${playlists.length} tracks**`);
				} catch (error) {
					//If it's not a playlist then add a single song instead
					let songInfo = await ytdl.getInfo(args[1]);
					let song = {
						title: songInfo.videoDetails.title,
						url: songInfo.videoDetails.video_url
					};
					serverQueue.songs.push(song);
					message.channel.send(`**Added ${song.title} to the queue**`);
				}
			}
		} catch (error) {
			// Something went really wrong
			console.log(error);
			message.channel.send(error.message);
		}
	},

	// Try to get a playlist
	async getPlayList(id) {
		// Scrape playlist, to be replaced
		const data = await scrapePlaylist(id);
		return data.playlist;
	},

	// async function that plays the musics
	async play(message, song) {
		const queue = message.client.queue;
		const guild = message.guild;
		const serverQueue = queue.get(message.guild.id);

		//Check for no more song
		if (!song) {
			message.channel.send('Could not find a song');
			serverQueue.voiceChannel.leave();
			queue.delete(guild.id);
			return;
		}

		try {
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
				// Filter for reactions for the messagebox
				return [ '⏭️', '⏯️' ].includes(reaction.emoji.name) && user.id === message.author.id;
			};
			message.channel.send({ embed: currentMusic }).then(async (react) => {
				// Initial reaction to the embedded message
				Promise.all([ react.react('⏭️'), react.react('⏯️') ]).catch(() =>
					console.error('One of the emojis failed to react.')
				);

				// Part that has the bot download the song and play it to the users
				const dispatcher = serverQueue.connection
					.play(ytdl(song.url, { quality: 'highestaudio', filter: 'audioonly', highWaterMark: 1 << 25 }))
					.on('finish', () => {
						// Remove the first element of the array and shift all the remaining to the left
						serverQueue.songs.shift();
						// Checks if the array is empty or null and returns if it is
						if (!Array.isArray(serverQueue.songs) || !serverQueue.songs.length) {
							console.log('List is no more');
							message.channel.send('There are no more songs in the queue');
							serverQueue.voiceChannel.leave();
							queue.delete(guild.id);
							return;
						} else {
							// More songs to play, therefore, call the function again
							react.delete({ timeout: 500 });
							dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
							this.play(message, serverQueue.songs[0]);
						}
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
				collector.on('collect', async (reaction) => {
					let userId = message.author.id;
					let emoji = reaction.emoji.name;

					// Skip song
					if (emoji === '⏭️') {
						const userReactions = react.reactions.cache.filter((rec) => rec.users.cache.has(userId));
						try {
							for (const rec of userReactions.values()) {
								await rec.users.remove(userId);
							}
							// Emits the finished event for the dispatcher
							return dispatcher.emit('finish');
						} catch (error) {
							console.error('Failed to skip');
						}
					}

					// Pause/Play
					if (emoji === '⏯️') {
						const userReactions = react.reactions.cache.filter((rec) => rec.users.cache.has(userId));
						try {
							for (const rec of userReactions.values()) {
								await rec.users.remove(userId);
							}
						} catch (error) {
							console.error('Failed to pause');
						}
						dispatcher.paused ? dispatcher.resume() : dispatcher.pause();
					}
				});
				collector.on('error', async (err) => {
					// Something wrong happened with processing the reactions
					console.log(err);
				});
			});
		} catch (err) {
			console.log(err);
			message.channel.send(err);
		}
	}
};
