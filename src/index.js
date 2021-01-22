require('dotenv').config()
const discord = require('discord.js')
const config = require('../config.json')

const { TOKEN } = process.env
const { prefix, name } = config

// Define the bot
const bot = {
    client: new discord.Client(),
    log: console.log, // eslint-disable-line no-console
}

/*
 * Define all the core functions for the bot lifecycle
 */

// Load the bot
bot.load = function load() {
    this.log('Connecting...')
    this.client.login(TOKEN)
}

// Fired on successful login
bot.onConnect = async function onConnect() {
    this.log(`Logged in as: ${this.client.user.tag} (id: ${this.client.user.id})`)
}

// Check and react to messages
bot.onMessage = async function onMessage(message) {
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
        // if the message contains any mentions, pick the first as the target
        if (message.mentions.users.size) {
            const taggedUser = message.mentions.users.first()
            message.channel.send(
                `User Info: ${
                    taggedUser.username
                } (account created: ${taggedUser.createdAt.toUTCString()})`,
            )
        } else {
            // default to sender if no user is mentioned
            const { author } = message
            message.reply(
                `User Self Info: ${
                    author.username
                } (account created: ${author.createdAt.toUTCString()})`,
            )
        }
    }
}

/*
 * Register event listeners
 */

bot.client.on('ready', bot.onConnect.bind(bot))
bot.client.on('error', err => {
    bot.log(`Client error: ${err.message}`)
})
bot.client.on('reconnecting', () => {
    bot.log('Reconnecting...')
})
bot.client.on('disconnect', evt => {
    bot.log(`Disconnected: ${evt.reason} (${evt.code})`)
})
bot.client.on('message', bot.onMessage.bind(bot))

// start the bot
bot.load()
