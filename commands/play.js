const ytdl = require('ytdl-core-discord');
const ytlist = require("youtube-playlist");
const Discord = require("discord.js");
const now = require('./now');
const Client = require('../client/Client');

const client = new Client();

module.exports = {
    name: "play",
    description: "Play a song in your channel!",
    async execute(message) {
        try {
            const queue = message.client.queue;
            const args = message.content.split(" ");
            const serverQueue = message.client.queue.get(message.guild.id);
            const voiceChannel = message.member.voice.channel;
            let validate = ytdl.validateURL(args[1]);

            // Check basic stuff so that the bot doesn't break
            if (!args[1]) return message.channel.send('??? There\'s no link brother');
            if (!validate) return message.channel.send('That\'s not even a proper link bro');
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

        // Play using ytdl-core-discord. A bit iffy but it "should" be more efficient
        async function play(message, song) {
            const queue = message.client.queue;
            const guild = message.guild;
            const serverQueue = queue.get(message.guild.id);

            if (!song) {
                message.channel.send('There are no more songs in the queue');
                queue.delete(guild.id);
                return;
            }

            // Create a dispatcher so that the bot can stream the music (Decide on waterMark to maybe help with lag issues. Don't know yet)
            try {
                let card = await now.execute(message);
                let richEmbed = message.channel.send({ embed: card }).then(async rEmbed => {
                    const dispatcher = serverQueue.connection.play(await ytdl(song.url), { type: 'opus', filter: 'audioonly', })
                        // highWaterMark: 1 << 25
                        .on('finish', () => {
                            // message.channel.filte(embedId).then(async msg => {
                            //     msg.delete({ timeout: 500 });
                            // })
                            rEmbed.delete({ timeout: 100 });
                            serverQueue.songs.shift();
                            play(message, serverQueue.songs[0]);
                        })
                        .on('error', error => {
                            console.error(error);
                        });
                })

            } catch {
                // If a video is unavailable or private it gets caught here and moves on to the next song in the playlist
                serverQueue.songs.shift();
                play(message, serverQueue.songs[0]);
            }

        }
    },
}