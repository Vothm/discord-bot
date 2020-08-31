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
            const serverQueue = message.client.queue.get(message.guild.id);
            const voiceChannel = message.member.voice.channel;
            let validate = ytdl.validateURL(args[1]);

            if (!args[1]) return message.channel.send('??? There\'s no link brother');
            if (!validate) return message.channel.send('That\'s not even a proper link bro');
            console.log(`voiceChannel: ${voiceChannel}`);
            if (!voiceChannel) return message.channel.send("You\'re not even in a channel dude");
            const permissions = voiceChannel.permissionsFor(message.client.user);
            if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
                return message.channel.send(
                    "I need the permissions to join and speak in your voice channel!"
                );
            };

            if (!serverQueue) {
                const queueContract = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    songs: [],
                    volume: 5,
                    playing: true
                };

                try {
                    await addSongs(args[1], queueContract.songs);
                } catch {
                    console.log('Failed to add songs to the queueContract');
                }

                queue.set(message.guild.id, queueContract);
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
                addSongs(args[1], serverQueue);
            }

        } catch (error) {
            console.error(error);
        }

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

            if (!song) {
                message.channel.send('There are no more songs in the queue');
                queue.delete(guild.id);
                return;
            }
            try {
                const dispatcher = serverQueue.connection.play(await ytdl(song.url), { type: 'opus' })
                    //, filter: 'audioonly', highWaterMark: 1 << 25 
                    .on('finish', () => {
                        serverQueue.songs.shift();
                        play(message, serverQueue.songs[0]);
                    })
                    .on('error', error => {
                        console.error(error);
                    });
            } catch {
                serverQueue.songs.shift();
                play(message, serverQueue.songs[0]);
            }

        }
    },
}