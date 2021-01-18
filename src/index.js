require('dotenv').config()
const Discord = require('discord.js')
const config = require('../config.json')

const bot = new Discord.Client()
const { TOKEN } = process.env

const { prefix, name } = config

bot.login(TOKEN)

bot.once('ready', () => {
    console.info(`Logged in as ${bot.user.tag}!`) // eslint-disable-line no-console
})

bot.on('message', message => {
    // ping command without a prefix (exact match)
    if (message.content === 'ping') {
        const delay = Date.now() - message.createdAt
        message.reply(`**pong** *(delay: ${delay}ms)*`)
        return
    }

    // ignore all other messages without our prefix
    if (!message.content.startsWith(prefix)) return

    // let the bot introduce itself (exact match)
    if (message.content === `${prefix}who`) {
        message.channel.send(`My name is ${name} and I was created to serve!`)
        return
    }

    // user info, either call with valid user name or default to info about message author
    if (message.content.startsWith(`${prefix}whois`)) {
        // if the message contains a mention, pick the first as the target
        if (message.mentions.users.size) {
            const taggedUser = message.mentions.users.first()
            const createdString = `${taggedUser.createdAt.toLocaleDateString()} - ${taggedUser.createdAt.toLocaleTimeString()}`
            message.channel.send(
                `User Info: ${taggedUser.username}  (account created: ${createdString})`,
            )
        } else {
            // default to sender if no user is mentioned
            const { author } = message
            const createdString = `${author.createdAt.toLocaleDateString()} - ${author.createdAt.toLocaleTimeString()}`
            message.reply(`User Self Info: ${author.username} (account created: ${createdString})`)
        }
    }
})
