const discord = require('discord.js')
const botCommands = require('./commands')

// Config
const configSchema = {
    defaultColors: {
        success: '#41b95f',
        neutral: '#287db4',
        warning: '#ff7100',
        error: '#c63737',
    },
}

const createBot = initialConfig => {
// Define the bot
const bot = {
    client: new discord.Client(),
    log: console.log, // eslint-disable-line no-console
    commands: new discord.Collection(),
}

/*
 * Define all the core functions for the bot lifecycle
 */

// Load the bot
bot.load = function load() {
    this.log('Loading commands...')
    Object.keys(botCommands).forEach(key => {
        this.commands.set(botCommands[key].name, botCommands[key])
    })
    this.log('Connecting...')
    this.client.login(TOKEN)
}

// Fired on successful login
bot.onConnect = async function onConnect() {
    this.log(`Logged in as: ${this.client.user.tag} (id: ${this.client.user.id})`)
}

// Check and react to messages
bot.onMessage = async function onMessage(message) {
    // ignore all other messages without our prefix
    if (!message.content.startsWith(prefix)) return

    const args = message.content.split(/ +/)
    // get the first word (lowercase) and remove the prefix
    const command = args.shift().toLowerCase().slice(prefix.length)

    if (!this.commands.has(command)) return

    try {
        this.commands.get(command).execute(message, args, bot)
    } catch (error) {
        this.log(error)
        message.reply('there was an error trying to execute that command!')
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

return {
    start: () => {
        return bot.load(initialConfig)
    },
}
}

module.exports = {
    createBot
}
