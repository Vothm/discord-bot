const fs = require('fs')
const Discord = require('discord.js');
const Client = require('./client/Client');
const {
	prefix,
	token,
	key
} = require('./config.json');
const now = require('./commands/now');
const client = new Client();
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

console.log(client.commands);

const Bearer = require('@bearer/node-agent')

Bearer.init({
	secretKey: key,
	stripSensitiveData: true,
}).then(() => {
	console.log('Bearer Initialized!')
})

client.on('ready', () => {
	console.log('Bot started');
});

client.on('message', async message => {


	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName);

	if (commandName === 'now') {
		message.channel.send({ embed: await now.execute(message) });
	} else {
		try {
			command.execute(message);
		} catch (error) {
			console.error(error);
			message.reply('Yo that\'s not part of the commands');
		}
	}
});


client.login(token);