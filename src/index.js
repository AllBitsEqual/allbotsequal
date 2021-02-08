const discord = require('discord.js')
const winston = require('winston')
const chalk = require('chalk')
const botCommands = require('./commands')

const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)

// Logger
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    modules: 3,
    modwarn: 4,
    modinfo: 5,
    debug: 6,
}
const logger = winston.createLogger({
    levels: logLevels,
    transports: [new winston.transports.Console({ colorize: true, timestamp: true })],
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.padLevels({ levels: logLevels }),
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} ${info.level}:${info.message}`),
    ),
    level: 'debug',
})
winston.addColors({
    error: 'red',
    warn: 'yellow',
    info: 'green',
    modules: 'cyan',
    modwarn: 'yellow',
    modinfo: 'green',
    debug: 'blue',
})

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
        log: logger,
        commands: new discord.Collection(),
    }

    /*
     * Define all the core functions for the bot lifecycle
     */
    bot.loadConfig = function loadConfig(config, tag, callback) {
        this.log.info(`${tag} Loading config...`)
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
            this.log.error(`Error loading config: ${err.message}`)
            this.log.error('Please fix the config error and retry.')
        }
    }

    // Load the bot
    bot.load = function load(config) {
        // Set up some properties
        this.config = {}
        const tag = config.tag || `[Bot ${config.index}]`

        // Load config, load modules, and login
        this.loadConfig(config, tag, () => {
            this.log.info(`${tag} Loading commands...`)
            Object.keys(botCommands).forEach(key => {
                this.commands.set(botCommands[key].name, botCommands[key])
            })
            this.log.info(`${tag} Connecting...`)
            this.client.login(this.config.token)
        })
    }

    // Fired on successful login
    bot.onConnect = async function onConnect() {
        this.log.info(
            chalk.cyan(
                `${this.config.tag} Logged in as: ${this.client.user.tag} (id: ${this.client.user.id})`,
            ),
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
            this.log.error(chalk.red(error))
            message.reply('there was an error trying to execute that command!')
        }
    }

    /*
     * Register event listeners
     */

    bot.client.on('ready', bot.onConnect.bind(bot))
    bot.client.on('error', err => {
        bot.log.error(chalk.red(`Client error: ${err.message}`))
    })
    bot.client.on('reconnecting', () => {
        bot.log.info('Reconnecting...')
    })
    bot.client.on('disconnect', evt => {
        bot.log.warn(chalk.yellow(`Disconnected: ${evt.reason} (${evt.code})`))
    })
    bot.client.on('message', bot.onMessage.bind(bot))

    return {
        start: () => bot.load(initialConfig),
    }
}

module.exports = {
    createBot,
}
