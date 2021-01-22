const { name } = require('../../config.json')

module.exports = {
    name: 'who',
    description: 'Who is this helpful bot?!',
    execute(message) {
        message.channel.send(`My name is ${name} and I was created to serve!`)
    },
}
