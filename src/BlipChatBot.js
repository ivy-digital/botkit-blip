var BlipSdk = require('blip-sdk');
var WebSocketTransport = require('lime-transport-websocket')

module.exports = function (Botkit, config) {

    var controller = Botkit.core(config);




    controller.defineBot(function (botkit, config) {

        var bot = {
            type: 'Blip',
            botkit: botkit,
            config: config || {},
            utterances: botkit.utterances,
        }


        // Create a client instance passing the identifier and accessKey of your chatbot 
        let client = new BlipSdk.ClientBuilder()
            .withIdentifier(config.identifier)
            .withAccessKey(config.access_key)
            .withTransportFactory(() => new WebSocketTransport())
            .build();



        // connect to the MessagingHub server
        client.connect()
            .then(() => {
                console.log('Listening...')


                bot.send = function (message, cb) {
                    client.sendMessage(message);
                }

                // this function takes an incoming message (from a user) and an outgoing message (reply from bot)
                // and ensures that the reply has the appropriate fields to appear as a reply
                bot.reply = function (src, resp, cb) {
                    if (typeof (resp) == 'string') {
                        resp = {
                            text: resp
                        }
                    }
                    resp.channel = src.channel;
                    bot.say(message, cb);
                }


            })
            .catch((err) => console.error(err));




        // this function defines the mechanism by which botkit looks for ongoing conversations
        // probably leave as is!
        bot.findConversation = function (message, cb) {
            for (var t = 0; t < botkit.tasks.length; t++) {
                for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
                    if (
                        botkit.tasks[t].convos[c].isActive() &&
                        botkit.tasks[t].convos[c].source_message.user == message.user &&
                        botkit.excludedEvents.indexOf(message.type) == -1 // this type of message should not be included
                    ) {
                        cb(botkit.tasks[t].convos[c]);
                        return;
                    }
                }
            }
            cb();
        };



        bot.connect = client;
        return bot;

    })


    // provide one or more normalize middleware functions that take a raw incoming message
    // and ensure that the key botkit fields are present -- user, channel, text, and type
    controller.middleware.normalize.use(function (bot, message, next) {

        console.log('NORMALIZE', message);
        next();

    });


    // provide one or more ways to format outgoing messages from botkit messages into 
    // the necessary format required by the platform API
    // at a minimum, copy all fields from `message` to `platform_message`
    controller.middleware.format.use(function (bot, message, platform_message, next) {
        for (var k in message) {
            platform_message[k] = message[k]
        }
        next();
    });


    // provide a way to receive messages - normally by handling an incoming webhook as below!
    controller.handleWebhookPayload = function (webserver, bot, cb) {


        bot.connect.addMessageReceiver(() => true, (m) => {
            controller.ingest(bot, m, null);

        })


        controller.startTicking();



        return bot;
    };


    return controller;

}