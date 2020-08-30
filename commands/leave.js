module.exports = {
    name: 'leave',
    description: 'leave the voice call with this command',
    execute(message) {
        if (!message.member.voice.channel) return message.channel.send('Bro the bot isn\'t even connected to a channel');

        if (!message.guild.me.voice.channel) return message.channel.send('Yo I\'m not even there');

        if ((message.guild.me.voice.channel.id) !== (message.member.voice.channel.id)) return message.channel.send('You\'re not even in the same channel');
        message.guild.me.voice.channel.leave();
        return message.channel.send("See ya nerd");
    }
};