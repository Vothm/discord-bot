const ytdl = require('ytdl-core');
const ytlist = require("youtube-playlist");
const Discord = require("discord.js");

module.exports = {
    name: "play",
    description: "Play a song in your channel!",
    async execute(message) {
        try {
            // Gather requirements from the message
            const queue = message.client.queue;
            const args = message.content.split(" ");
            const serverQueue = message.client.queue.get(message.guild.id);
            const voiceChannel = message.member.voice.channel;
            let validate = await ytdl.validateURL(args[1]);

            if (!args[1]) return message.channel.send('??? There\'s no link brother');
            console.log(`voiceChannel: ${voiceChannel}`);
            if (!voiceChannel) return message.channel.send("You\'re not even in a channel dude");
            const permissions = voiceChannel.permissionsFor(message.client.user);
            if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
                return message.channel.send(
                    "I need the permissions to join and speak in your voice channel!"
                );
            };

            // Validate if the link is a link where it IS a playlist but the link does not include the video of the playlist
            if (!validate) {
                try {
                    await ytlist(args[1], ['name', 'url']).then(res => {
                        return res.data.playlist;
                    })
                } catch {
                    message.channel.send(`That\'s not even a proper link`);
                }
            };

            // If there is nothing in the playlist, then create a contract that includes properties of the bot
            if (!serverQueue) {
                const queueContract = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    songs: [],
                    volume: 5,
                    playing: true
                };

                // Check if it's a playlist, then add each song to the server contract
                try {
                    await ytlist(args[1], ['name', 'url']).then(res => {
                        return res.data.playlist;
                    }).then(arr => {
                        for (let i = 0; i < arr.length; i++) {

                            var playlist = {
                                title: arr[i].name,
                                url: arr[i].url,
                            };
                            console.log(`${playlist.title} - ${playlist.url}`)
                            queueContract.songs.push(playlist);
                        }
                        queue.set(message.guild.id, queueContract);
                        message.channel.send(`**Added ${arr.length} tracks**`);
                    })
                } catch {
                    // If the link did not contain a playlist, just gather the individual song then add to the server contract
                    let info = await ytdl.getInfo(args[1]);
                    let song = {
                        title: info.videoDetails.title,
                        url: info.videoDetails.video_url,
                    };
                    console.log(`Pushing song: ${song.title}\n${song.url}`);
                    queue.set(message.guild.id, queueContract);
                    queueContract.songs.push(song);
                }

                // After adding songs to the contract create a connection from the bot to the voice channel and play the song
                try {
                    var connection = await voiceChannel.join();
                    queueContract.connection = connection;
                    this.play(message, queueContract.songs[0]);
                } catch (err) {
                    console.log(err);
                    queue.delete(message.guild.id);
                    return message.channel.send(err);
                }
            } else {

                // This means that serverQueue is already a thing which means the contract has also been created
                // Check for a playlist, then add to the serverQueue. If not, add the single song
                try {
                    await ytlist(args[1], ['name', 'url']).then(res => {
                        return res.data.playlist;
                    }).then(arr => {
                        for (let i = 0; i < arr.length; i++) {
                            let songFromPlaylist = {
                                title: arr[i].name,
                                url: arr[i].url
                            };
                            serverQueue.songs.push(songFromPlaylist);
                        }
                        message.channel.send(`**Added ${arr.length} items to the queue**`);
                    });
                } catch {
                    const songInfo = await ytdl.getInfo(args[1]);
                    const song = {
                        title: songInfo.player_response.videoDetails.title,
                        url: songInfo.player_response.videoDetails.video_url
                    };
                    serverQueue.songs.push(song);
                    message.channel.send(`**Added ${song.title} to the queue**`)
                };
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

        // Check if there is a next song, else just clear the queue and connection to the server
        if (!song) {
            message.channel.send('There are no more songs in the queue');
            queue.delete(guild.id);
            return;
        }

        try {
            if (serverQueue) {
                // Prepare an embedded message to show the information of the current song
                let info = await ytdl.getInfo(serverQueue.songs[0].url);
                const songInfo = {
                    title: info.player_response.videoDetails.title,
                    url: info.player_response.videoDetails.video_url,
                    shortDescription: info.player_response.videoDetails.shortDescription,
                    id: info.player_response.videoDetails.videoId,
                }
                let recievedEmbed = message.embeds[0];
                let currentMusic = new Discord.MessageEmbed(recievedEmbed)
                    .setColor('#FF0000')
                    .setTitle(`Now playing: ${info.player_response.videoDetails.video_url}`)
                    .setURL(songInfo.url)
                    .setThumbnail(`https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`)
                    .setFooter(`${info.player_response.videoDetails.title}\n${serverQueue.songs.length - 1} songs left`, `https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`)
                    .setImage(`https://img.youtube.com/vi/${songInfo.id}/maxresdefault.jpg`)

                // Prepare a filter to listen to reactions to do specific commands
                const filter = (reaction, user) => {
                    // This makes it so anyone in the current voice chat can use the commands in the embed
                    return ['⏭️', '⏯️'].includes(reaction.emoji.name) && user.id !== message.guild.me.id;
                };

                // Sends the embed, try to resolve a promise to react all the emojis
                message.channel.send({ embed: currentMusic })
                    .then(async react => {
                        Promise.all([
                            react.react('⏭️'),
                            react.react('⏯️'),
                        ])
                            .catch(() => console.error('One of the emojis failed to react.'))

                            // After resolving the promise connect to the voice channel and then play music
                            // ytdl-core-discord will use opus as the default but will go back to FFMPEG if not supported by the YT link
                            .then(async () => {
                                const dispatcher = serverQueue.connection
                                    .play(ytdl(song.url), { quality: 'highestaudio', filter: 'audioonly', })
                                    .on("finish", () => {
                                        serverQueue.songs.shift();
                                        this.play(message, serverQueue.songs[0]);
                                        react.delete({ timeout: 500 });
                                        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
                                    })
                                    .on("error", error => console.error(error));

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

                                // Create an event listener that will always listen for emoji responses 
                                const collector = react.createReactionCollector(filter);
                                collector.on('collect', async (reaction, user) => {
                                    if (reaction.emoji.name === '⏭️') {
                                        let userId = user.id;
                                        // If the member isn't in the voice channel then don't let them control the bot
                                        if (!message.guild.member(userId).voice.channel) {
                                            const userReactions = react.reactions.cache.filter(rec => rec.users.cache.has(userId));
                                            try {
                                                for (const rec of userReactions.values()) {
                                                    await rec.users.remove(userId);
                                                }
                                            } catch (error) {
                                                console.error('Failed to remove');
                                            }
                                            return message.channel.send(`${user} Bitch you tried`);
                                        }
                                        // .shift() pops the first item in an array
                                        serverQueue.songs.shift();
                                        react.delete({ timeout: 500 });
                                        // the play function is recursive so we just call play again and go to the next song
                                        this.play(message, serverQueue.songs[0]);
                                    }

                                    if (reaction.emoji.name === '⏯️') {
                                        let userId = user.id;
                                        const userReactions = react.reactions.cache.filter(rec => rec.users.cache.has(userId)); 3
                                        try {
                                            for (const rec of userReactions.values()) {
                                                await rec.users.remove(userId);
                                            }
                                        } catch (error) {
                                            console.error('Failed to remove');
                                        };
                                        //message.channel.send(`userID ${userId}\nuser ${user}\nMessageMember${message.member}\nid ${message.guild.member(user.id).voice.channel.id}`)
                                        if (!message.guild.member(userId).voice.channel) return message.channel.send(`${user} Bitch you tried`);
                                        if (dispatcher.paused) {
                                            dispatcher.resume();
                                        } else {
                                            dispatcher.pause();
                                        };
                                    };
                                });
                            })
                    })
            } else {
                message.channel.send('Nothing else in the queue');
            }
        } catch (err) {
            serverQueue.songs.shift();
            this.play(message, serverQueue.songs[0]);
            console.log('You fucked up ' + err);
        }
    },
};