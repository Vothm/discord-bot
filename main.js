const fs = require('fs');
const Discord = require('discord.js');
const cleverbot = require('cleverbot-free');
const Client = require('./client/Client');
const { prefix, token } = require('./config.json');

const client = new Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

console.log(client.commands);

client.on('ready', () => {
	console.log('Bot started');
});

let ll = (user) => {
	user;
};

client.on('message', async (message) => {
	if (message.author.id === ll.user && message.content.toLowerCase().includes('safe word')) {
		ll.user = '';
		message.reply('Bye');
	}
	// if (message.content.toLowerCase().includes('hi')) {
	// 	message.reply('Fuck you');
	// }
	if (message.content.toLowerCase() === 'hey stupid') {
		message.reply('What the hell do you want');
		ll.user = message.author.id;
	}
	if (message.author.id === ll.user) {
		message.channel.send(await cleverbot(message.content));
	}
	if (message.content.toLowerCase().includes('uwu')) {
		message.reply('No');
	}
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName);

	try {
		command.execute(message);
	} catch (error) {
		console.error(error);
		message.reply("Yo that's not part of the commands");
	}
});

client.on('voiceStateUpdate', (oldState, newState) => {
	const queue = oldState.client.queue;
	// if (!queue) {
	// 	return;
	// }
	// check if someone connects or disconnects
	if (oldState.channelID === null || typeof oldState.channelID == 'undefined') return;
	// check if the bot is disconnecting
	if (newState.id !== client.user.id) return;
	// clear the queue
	return queue.delete(oldState.guild.id);
});

client.login(token);
