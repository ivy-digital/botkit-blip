var Botkit = require('botkit');


var controller = require('../src/BlipChatBot.js')(Botkit, {});

var bot = controller.spawn({
  identifier: 'agsisuporte', access_key: 'czJZdmNCTW1KbDQ2N0hidElXM1o='
});

controller.handleWebhookPayload(webserver, bot, function () {
  console.log('ONLINE!');
});

// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require('./express_webserver.js')(controller, bot);

