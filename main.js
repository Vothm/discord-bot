const fs = require('fs');
const Discord = require('discord.js');
const Client = require('./client/Client');
const {
	prefix,
	token,
} = require('./config.json');

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

client.on('message', async (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName);

	try {
		command.execute(message);
	} catch (error) {
		console.error(error);
		message.reply('Yo that\'s not part of the commands');
	}
});

client.login(token);
