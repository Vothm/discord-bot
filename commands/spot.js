const { execute } = require("./now");
const SpotifyControl = require('spotify-control');

const {
    spotifyToken
} = require('../config.json');


module.exports = {
    name: 'spot',
    description: 'A command to run spotify playlists',
    async execute(message) {
        const queue = message.client.queue;
        const args = message.content.split(" ");
        const voiceChannel = message.member.voice.channel;
        const serverQueue = message.client.queue.get(message.guild.id);
        var spotify = new SpotifyControl({
            token: spotifyToken
        });

        try {
            const connection = await message.member.voice.channel.join();
            play(message, spotify);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }



        async function play(message, spotify) {
            const queue = message.client.queue;
            const guild = message.guild;
            const serverQueue = queue.get(message.guild.id);

            // if (!song) {
            //     message.channel.send('There are no more songs in the queue');
            //     message.guild.me.voice.channel.leave();
            //     queue.delete(guild.id);
            //     return;
            // }

            spotify.connect().then(v => {
                console.log("Stated");
                const dispatcher = serverQueue.connection.play(spotify.play("spotify:track:4LYt31Tg51qsQqWOaZn4C6", "spotify:artist:5byg90wTxATnhB6kK253DF")).then(v => {
                    console.log('Playing');
                    spotify.startListener(["play", "pause"]).on("event", data => {
                        console.log(JSON.stringify(data, null, 4));
                    });
                })
                    .on("finish", () => {
                        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
                        console.log('Finished');
                    })
                    .on("error", error => {
                        console.log(`Dispatcher error` + error)
                    })
            })
        }
    }
}