const ytdl = require('ytdl-core-discord');
const ytlist = require("youtube-playlist");
const Discord = require("discord.js");
const now = require('./now');

module.exports = {
    name: "play",
    description: "Play a song in your channel!",
    async execute(message) {
        try {
            const queue = message.client.queue;
            const args = message.content.split(" ");
            let validate = await ytdl.validateURL(args[1]);
            if (!args[1]) return message.channel.send('??? There\'s no link brother');
            if (!validate) return message.channel.send('That\'s not even a proper link bro');
            const serverQueue = message.client.queue.get(message.guild.id);

            const voiceChannel = message.member.voice.channel;

            console.log(`voiceChannel: ${voiceChannel}`);
            if (!voiceChannel) return message.channel.send("You\'re not even in a channel dude");
            const permissions = voiceChannel.permissionsFor(message.client.user);
            if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
                return message.channel.send(
                    "I need the permissions to join and speak in your voice channel!"
                );
            };
            // If there is no music in the queue, make a contract that containts properties for the connection
            if (!serverQueue) {
                const queueContract = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    songs: [],
                    volume: 5,
                    playing: true
                };

                // Add songs: automatically checks if it's a single or playlist link
                try {
                    await addSongs(args[1], queueContract.songs);
                } catch {
                    console.log('Failed to add songs to the queueContract');
                }

                queue.set(message.guild.id, queueContract);

                // Connect the bot to voice channel and play music
                try {
                    const connection = await message.member.voice.channel.join();
                    queueContract.connection = connection;
                    play(message, queueContract.songs[0]);
                } catch (err) {
                    console.log(err);
                    queue.delete(message.guild.id);
                    return message.channel.send(err);
                }

            } else {
                // Assume that server contract is already made, therefore just add song/playlist to the queue
                addSongs(args[1], serverQueue);
            }

        } catch (error) {
            console.error(error);
        }

        // function to add songs to a specific queue. The playlist can only return 100 songs but I don't think anyone is gonna queue up > 100 anyway. 
        async function addSongs(url, queue) {
            try {
                await ytlist(url, ['url', 'name']).then(res => {
                    for (let i = 0; i < res.data.playlist.length; i++) {
                        const song = {
                            title: res.data.playlist[i].name,
                            url: res.data.playlist[i].url,
                        }
                        queue.push(song);
                    }
                    message.channel.send(`**Added ${res.data.playlist.length} tracks**`)
                });
            } catch {
                await ytdl.getInfo(url).then(res => {
                    const song = {
                        title: res.player_response.videoDetails.title,
                        url: res.video_url,
                    }
                    queue.push(song);
                });
            }
        }

        async function play(message, song) {
            const queue = message.client.queue;
            const guild = message.guild;
            const serverQueue = queue.get(message.guild.id);
            //message.channel.send(`message.guild.me ${message.guild.me.id}`)


            if (!song) {
                message.channel.send('There are no more songs in the queue');
                queue.delete(guild.id);
                return;
            }

            try {
                if (serverQueue) {

                    let info = await ytdl.getInfo(serverQueue.songs[0].url);
                    let songInfo = {
                        title: info.player_response.videoDetails.title,
                        url: info.video_url,
                        shortDescription: truncateString(info.description, 200),
                        id: info.video_id,
                    }

                    let card = await now.execute(message);

                    const filter = (reaction, user) => {
                        return ['⏭️', '⏯️'].includes(reaction.emoji.name) && user.id !== message.guild.me.id;
                    };
                    message.channel.send({ embed: card })
                        .then(async react => {
                            Promise.all([
                                react.react('⏭️'),
                                react.react('⏯️'),
                            ])
                                .catch(() => console.error('One of the emojis failed to react.'))
                                .then(async () => {
                                    const dispatcher = serverQueue.connection.play(await ytdl(song.url), {
                                        type: 'opus',
                                        filter: 'audioonly',
                                        //highWaterMark: 1 << 10,
                                        quality: 'highestaudio',
                                    })
                                        .on("finish", () => {
                                            serverQueue.songs.shift();
                                            play(message, serverQueue.songs[0]);
                                            react.delete({ timeout: 500 });
                                            dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
                                        })
                                        .on("error", error => {
                                            react.delete({ timeout: 500 });
                                            serverQueue.songs.shift();
                                            play(message, serverQueue.songs[0]);
                                            console.log(`Dispatcher error` + error)
                                        })

                                    // Useful only if you know how many reactions you want
                                    // react.awaitReactions(filter, { max: 1 }).then(async collected => {
                                    //     const reaction = collected.first();
                                    //     if (reaction.emoji.name === '⏭️') {
                                    //         serverQueue.songs.shift();
                                    //         react.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    //         react.delete({ timeout: 500 });
                                    //         play(message, serverQueue.songs[0]);
                                    //     }
                                    // }).catch(collected => {
                                    //     console.log('Idk what happened ' + collected);
                                    // });

                                    const collector = react.createReactionCollector(filter);
                                    collector.on('collect', async (reaction, user) => {
                                        if (reaction.emoji.name === '⏭️') {
                                            let userId = user.id;
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
                                            serverQueue.songs.shift();
                                            react.delete({ timeout: 500 });
                                            play(message, serverQueue.songs[0]);
                                        }

                                        if (reaction.emoji.name === '⏯️') {
                                            let userId = user.id;
                                            const userReactions = react.reactions.cache.filter(rec => rec.users.cache.has(userId));
                                            //message.channel.send(`userID ${userId}\nuser ${user}\nMessageMember${message.member}\nid ${message.guild.member(user.id).voice.channel.id}`)
                                            if (!message.guild.member(userId).voice.channel) {
                                                try {
                                                    for (const rec of userReactions.values()) {
                                                        await rec.users.remove(userId);
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to remove');
                                                }
                                                return message.channel.send(`${user} Bitch you tried`);
                                            };

                                            try {
                                                for (const rec of userReactions.values()) {
                                                    await rec.users.remove(userId);
                                                }
                                            } catch (error) {
                                                console.error('Failed to remove');
                                            };

                                            if (dispatcher.paused) {
                                                //message.channel.send('Resuming');
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
                console.log('You fucked up ' + err + '\nPlaying next song...');
                play(message, serverQueue.songs[0]);
            }

            function truncateString(str, num) {
                if (str.length <= num) {
                    return str
                }
                return str.slice(0, num) + '...'
            }
        }
    },
};