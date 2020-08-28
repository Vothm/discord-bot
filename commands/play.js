const ytdl = require("ytdl-core");
const ytlist = require("youtube-playlist");

module.exports = {
    name: "play",
    description: "Play a song in your channel!",
    async execute(message) {
        try {
            const queue = message.client.queue;
            const args = message.content.split(" ");
            if (!args[1]) return message.channel.send('??? There\'s no link brother');
            //console.log('The queue is: ' + queue);
            const serverQueue = message.client.queue.get(message.guild.id);
            //console.log('The serverQueue is: ' + serverQueue);

            const voiceChannel = message.member.voice.channel;
            console.log(`voiceChannel: ${voiceChannel}`);
            if (!voiceChannel)
                return message.channel.send(
                    "You\'re not even in a channel dude"
                );
            const permissions = voiceChannel.permissionsFor(message.client.user);
            if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
                return message.channel.send(
                    "I need the permissions to join and speak in your voice channel!"
                );
            }
            // message.channel.send(`serverQueue ${serverQueue}`)
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
                    await ytlist(args[1], ['name', 'url']).then(res => {
                        return res.data.playlist;
                    }).then(arr => {
                        message.channel.send(`Found a playlist with ${arr.length} songs`);
                        for (let i = 0; i < arr.length; i++) {

                            var playlist = {
                                title: arr[i].name,
                                url: arr[i].url,
                            };
                            console.log(`${playlist.title} - ${playlist.url}`)
                            queueContruct.songs.push(playlist);
                        }
                        queue.set(message.guild.id, queueContruct);
                        message.channel.send(`**Added ${arr.length} tracks**`);
                    })
                } catch {
                    let info = await ytdl.getInfo(args[1]);
                    let song = {
                        title: info.videoDetails.title,
                        url: info.videoDetails.video_url,
                    };
                    console.log(`Pushing song: ${song.title}\n${song.url}`);
                    queue.set(message.guild.id, queueContruct);
                    queueContruct.songs.push(song);
                }


                try {
                    // message.channel.send(`Awaiting to join`)
                    var connection = await voiceChannel.join();
                    queueContruct.connection = connection;
                    this.play(message, queueContruct.songs[0]);
                } catch (err) {
                    console.log(err);
                    queue.delete(message.guild.id);
                    return message.channel.send(err);
                }

            } else {
                serverQueue.songs.push(song);
                return message.channel.send(
                    `${song.title} has been added`
                );
            }
        } catch (error) {
            console.log(error);
            message.channel.send(error.message);
        }
    },

    play(message, song) {
        const queue = message.client.queue;
        const guild = message.guild;
        const serverQueue = queue.get(message.guild.id);

        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }

        const dispatcher = serverQueue.connection
            .play(ytdl(song.url, { filter: 'audioonly' }))
            .on("finish", () => {
                serverQueue.songs.shift();
                this.play(message, serverQueue.songs[0]);
            })
            .on("error", error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Now Playing: **${song.title}**`);
    }
};