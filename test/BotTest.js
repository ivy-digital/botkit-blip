var Botkit = require('botkit');

var controller = require('../src/BlipChatBot.js')(Botkit, {debug: true,  log: true});


var bot = controller.spawn({
  identifier: 'agsisuporte', 
  access_key: 'czJZdmNCTW1KbDQ2N0hidElXM1o='
});



// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require('./express_webserver.js')(controller, bot);

controller.createWebhookEndpoints(bot, function () {
  console.log('ONLINE!');
});


controller.startTicking();

require("./faq-convo")(controller)
