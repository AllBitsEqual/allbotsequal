require('dotenv').config()
const config = require('./config.json')
const BotFactory = require('./src/index')

const { bots } = config

bots.forEach(botConfig => {
    const { name, token, prefix } = botConfig
    const bot = BotFactory.createBot({
        token: process.env[token],
        name,
        prefix,
    })

    bot.start()
})
