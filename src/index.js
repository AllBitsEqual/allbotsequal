const discord = require('discord.js')
const botCommands = require('./commands')

const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)

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

    bot.loadConfig = function loadConfig(config, tag, callback) {
        this.log(`${tag} Loading config...`)
        try {
            if (!config || !has(config, 'token')) {
                throw Error(`${tag} Config or token are missing.`)
            }
            this.config = {
                ...configSchema,
                ...config,
                tag,
            }
            callback()
        } catch (err) {
            this.log(`Error loading config: ${err.message}`)
            this.log('Please fix the config error and retry.')
        }
    }

    // Load the bot
    bot.load = function load(config) {
        // Set up some properties
        this.config = {}
        const tag = config.tag || `[Bot ${config.index}]`

        // Load config, load modules, and login
        this.loadConfig(config, tag, () => {
            this.log(`${tag} Loading commands...`)
            Object.keys(botCommands).forEach(key => {
                this.commands.set(botCommands[key].name, botCommands[key])
            })
            this.log(`${tag} Connecting...`)
            this.client.login(this.config.token)
        })
    }

    // Fired on successful login
    bot.onConnect = async function onConnect() {
        this.log(
            `${this.config.tag} Logged in as: ${this.client.user.tag} (id: ${this.client.user.id})`,
        )
    }

    // Check and react to messages
    bot.onMessage = async function onMessage(message) {
        // ignore all other messages without our prefix
        if (!message.content.startsWith(this.config.prefix)) return

        const args = message.content.split(/ +/)
        // get the first word (lowercase) and remove the prefix
        const command = args.shift().toLowerCase().slice(this.config.prefix.length)

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
        start: () => bot.load(initialConfig),
    }
}

module.exports = {
    createBot,
}
