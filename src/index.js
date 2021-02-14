const os = require('os')
const path = require('path')
const fs = require('fs')
const discord = require('discord.js')
const winston = require('winston')
const chalk = require('chalk')
const opn = require('opn')
const mkdirp = require('mkdirp')
const jsonfile = require('jsonfile')
const botCommands = require('./commands')

const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
const sanitise = str => str.replace(/[^a-z0-9_-]/gi, '')

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
const logger = tag =>
    winston.createLogger({
        levels: logLevels,
        transports: [new winston.transports.Console({ colorize: true, timestamp: true })],
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.padLevels({ levels: logLevels }),
            winston.format.timestamp(),
            winston.format.printf(info => `${info.timestamp} ${info.level}: ${tag}${info.message}`),
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
    discordToken: { type: 'string', default: 'Paste your bot token here.' },
    owner: { type: 'string', default: '' },
    name: { type: 'string', default: 'BotAnon' },
    defaultGame: { type: 'string', default: '$help for help' },
    prefix: { type: 'string', default: '$' },
    commandAliases: { type: 'object', default: {} },
    defaultColors: {
        type: 'object',
        default: {
            neutral: { type: 'string', default: '#287db4' },
            error: { type: 'string', default: '#c63737' },
            warning: { type: 'string', default: '#ff7100' },
            success: { type: 'string', default: '#41b95f' },
        },
    },
    settings: { type: 'object', default: {} },
}

const createBot = initialConfig => {
    // Define the bot
    const bot = {
        client: new discord.Client(),
        log: logger(initialConfig.tag || `[Bot ${initialConfig.index}]`),
        commands: new discord.Collection(),
    }

    /*
     * Define all the core functions for the bot lifecycle
     */

    // Set the config directory to use
    bot.setConfigDirectory = function setConfigDirectory(configDir) {
        this.configDir = configDir
        this.configFile = path.join(configDir, 'config.json')
    }

    // Open the config file in a text editor
    bot.openConfigFile = function openConfigFile() {
        bot.log.info('Opening config file in a text editor...')
        opn(this.configFile)
            .then(() => {
                bot.log.info('Exiting.')
                process.exit(0)
            })
            .catch(err => {
                this.log.error('Error opening config file.')
                throw err
            })
    }

    // Set default config directory
    bot.setConfigDirectory(path.join(os.homedir(), `.discord-${sanitise(initialConfig.name)}-bot`))

    // Recursively iterate over the config to check types and reset properties to default if they are the wrong type
    bot.configIterator = function configIterator(startPoint, startPointInSchema) {
        Object.keys(startPointInSchema).forEach(property => {
            if (!has(startPoint, property)) {
                if (startPointInSchema[property].type !== 'object') {
                    startPoint[property] = startPointInSchema[property].default
                } else {
                    startPoint[property] = {}
                }
            }
            if (startPointInSchema[property].type === 'object') {
                configIterator(startPoint[property], startPointInSchema[property].default)
            }
            if (
                !Array.isArray(startPoint[property]) &&
                typeof startPoint[property] !== startPointInSchema[property].type
            ) {
                startPoint[property] = startPointInSchema[property].default
            }
        })
    }

    bot.loadConfig = function loadConfig(config, callback) {
        bot.log.info(`Checking for config file...`)
        const configExists = fs.existsSync(this.configFile)

        /*
         *  If file does not exist, create it
         */
        if (!configExists) {
            bot.log.info(`No config file found, generating...`)
            try {
                mkdirp.sync(path.dirname(this.configFile))
                const { token, name, prefix } = initialConfig
                const baseConfig = {
                    discordToken: token,
                    prefix,
                    name,
                }
                fs.writeFileSync(this.configFile, JSON.stringify(baseConfig, null, 4))
            } catch (err) {
                this.log.error(chalk.red.bold(`Unable to create config.json: ${err.message}`))
                throw err
            }
        }

        /*
         * Load the created file, even if it is empty
         */
        this.log.info(`Loading config...`)
        try {
            this.config = JSON.parse(fs.readFileSync(this.configFile))
        } catch (err) {
            this.log.error(`Error reading config: ${err.message}`)
            this.log.error(
                'Please fix the config error or delete config.json so it can be regenerated.',
            )
            throw err
        }

        /*
         * iterate over the given config, check all values santise
         */
        this.configIterator(this.config, configSchema)

        /*
         * write the changed/created config file to the directory
         * if config was newly created, open the config file for the user
         */
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 4))
        if (!configExists) {
            this.log.warn('Config file created for the first time.')
            this.log.warn('Please check the opened new file for completeness!')
            this.openConfigFile()
        }

        /*
         * read the new file and assign it to the bot's config
         */
        jsonfile.readFile(this.configFile, (err, obj) => {
            if (err) {
                bot.log.error(chalk.red.bold(`Unable to load config.json: ${err.message}`))
                throw err
            } else {
                bot.config = obj
            }
        })

        /*
         * check the config file and look for the token
         */
        this.log.info(`Reading config...`)
        try {
            if (!config || !has(config, 'token')) {
                throw Error(`Config or token are missing.`)
            }
            this.config = {
                ...configSchema,
                ...config,
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

        // Load config, load modules, and login
        this.loadConfig(config, () => {
            this.log.info(`Loading commands...`)
            Object.keys(botCommands).forEach(key => {
                this.commands.set(botCommands[key].name, botCommands[key])
            })
            this.log.info(`Connecting...`)
            this.client.login(this.config.token)
        })
    }

    // Fired on successful login
    bot.onConnect = async function onConnect() {
        this.log.info(
            chalk.cyan(`Logged in as: ${this.client.user.tag} (id: ${this.client.user.id})`),
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
