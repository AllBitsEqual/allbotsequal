require('dotenv').config()
const config = require('./config.json')
const BotFactory = require('./src/index')

const { bots } = config

bots.forEach((botConfig, index) => {
    const { token } = botConfig
    const bot = BotFactory.createBot({
        ...botConfig,
        token: process.env[token],
        index,
    })

    bot.start()
})
