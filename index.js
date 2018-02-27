if (!process.env.BOT_TOKEN) {
  console.error('No BOT_TOKEN env variable present');
  process.exit(1);
}
const Telegraf = require('telegraf');
const request = require('request');
const cheerio = require('cheerio');


const getDefinition = word => new Promise((resolve, reject) => {
  request.get({
    url: 'https://www.eki.ee/dict/evs/index.cgi',
    qs: {
      Q: word,
      Qphon: '',
      F: 'M',
    },
  }, (error, response, body) => {
    if (error) {
      return reject(error);
    }
    return resolve(body);
  });
});

const transform = (html) => {
  const $ = cheerio.load(html);
  return $('.tervikart', '.pagecontent').map((i, el) => $(el).text()).get();
};

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(ctx => ctx.reply('Tere tulemast!'));
bot.on('message', async (ctx) => {
  const {
    message,
    reply,
  } = ctx;
  let html;
  try {
    html = await getDefinition(message.text);
  } catch (err) {
    console.error(err);
    return reply('Error with fetching data, try again later!');
  }

  const texts = transform(html);
  if (!texts.length) {
    return reply(`No translation for word "${message.text}"`);
  }

  return texts.reduce((array, text) => {
    const charsLength = text.length;
    if (charsLength <= 4000) {
      array.push(text);
    } else {
      for (let i = 0; i < charsLength; i += 4000) {
        array.push(text.substring(i, i + 4000));
      }
    }

    return array;
  }, [])
    .map((text, index) => setTimeout(() => reply(text), index * 1000));
});
bot.on('/quit', (ctx) => {
  ctx.leaveChat();
});
bot.startPolling();
