const discord = require('discord.js')

const getDiceResult = args => {
    // get the param or default to "1d6"
    const [diceParam = '1d6', ...rest] = args
    // split rolls and sides when applicable
    const [rolls = 1, sides = 6] = diceParam.split('d')

    // check if rolls and dice are integer
    const intRolls = Number.isNaN(parseInt(rolls, 10)) ? 1 : parseInt(rolls, 10)
    const intSides = Number.isNaN(parseInt(sides, 10)) ? 6 : parseInt(sides, 10)

    // check if rolls and dice are within predefined rules
    const safeRolls = intRolls >= 1 && intRolls <= 10 ? intRolls : 1
    const safeSides = [2, 3, 4, 6, 8, 10, 12, 20, 100].includes(intSides) ? intSides : 6

    // check if the calculated params match the original params of the user
    if (parseInt(rolls, 10) !== safeRolls || parseInt(sides, 10) !== safeSides)
        return {
            type: 'error',
            title: 'Invalid Parameter',
            fieldName:
                'Please specify either no parameter or add a dice count such as 1d6 or 3d12.',
            fieldContent: 'Please see "!help dice" for additional information.',
        }

    // roll the dice
    const results = []
    for (let i = 0; i < safeRolls; i++) results.push(Math.ceil(Math.random() * safeSides))

    // format the response
    return {
        type: 'success',
        title: 'Dice Roll Result',
        fieldName: `You rolled ${safeRolls}d${safeSides}`,
        fieldContent: `[ ${results.sort((a, b) => a - b).join(', ')} ]`,
        rest,
    }
}

module.exports = {
    name: 'dice',
    description:
        `Roll a number of dice, either with no argument for 1 d6, ` +
        `one argument for a number of dice between 1 and 10 or with 2 arguments ` +
        `to define the dices' sides. (2, 3, 4, 6, 8, 10, 12, 20, 100)`,
    async execute(message, args, bot) {
        const { type, title, fieldName, fieldContent, rest } = getDiceResult(args)
        const embed = new discord.MessageEmbed()
            .setTitle(title) // The title of the discord embedded message
            .setColor(bot.config.defaultColors[type]) // either "success" or "error"
            .addField(fieldName, fieldContent) // our dice results or error message
        // all additional/optional text the user entered after the params
        if (rest && rest.length) {
            embed.addField(`You added the following: `, rest.join(' '))
        }

        message.channel.send({ embed })
    },
}
