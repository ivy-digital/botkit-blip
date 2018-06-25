var BlipSdk = require('blip-sdk');
let Lime = require('lime-js');
var WebSocketTransport = require('lime-transport-websocket')
module.exports = function (Botkit, config) {

    var controller = Botkit.core(config);


    controller.defineBot(function (botkit, config) {

        var bot = {
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


        client.connect();
        // connect to the MessagingHub server



        bot.send = async function (message, cb) {

            function done(err, res) {
                if (cb) {
                    cb(err);
                }
            }

            if (!message || !message.to) {
                if (cb) {
                    cb(new Error('Outgoing message requires a valid address...'));
                }
                return;
            }


            // Copy message minus user & channel fields
            var bf_message = {};
            for (var key in message) {
                switch (key) {
                    case 'user':
                    case 'channel':
                        // ignore
                        break;
                    default:
                        bf_message[key] = message[key];
                        break;
                }
            }
            if (!bf_message.type) {
                bf_message.type = 'message';
            }



            // Send message through connector
            client.sendMessage([bf_message])
            done();

        }

        // this function takes an incoming message (from a user) and an outgoing message (reply from bot)
        // and ensures that the reply has the appropriate fields to appear as a reply
        bot.reply = async function (src, resp, cb) {

            let header = {
                id: Lime.Guid(),
                to: src.from
            }

            let msg = Object.assign(header, resp);

            if (!msg.content) {
                msg.content = msg.text;
            }

            if (!msg.type) {
                msg.type = 'text/plain'
            }

            bot.say(msg, cb);
        }


        bot.findConversation = function (message, cb) {
            botkit.debug('CUSTOM FIND CONVO', message.user, message.channel);
            for (var t = 0; t < botkit.tasks.length; t++) {
                for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
                    if (
                        botkit.tasks[t].convos[c].isActive() &&
                        botkit.tasks[t].convos[c].source_message.user == message.user &&
                        botkit.tasks[t].convos[c].source_message.channel == message.channel &&
                        botkit.excludedEvents.indexOf(message.type) == -1 // this type of message should not be included
                    ) {
                        botkit.debug('FOUND EXISTING CONVO!');
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

        var canal = message.from.split("@");

        message.user = message.from.split('/')[0];
        message.channel = canal[1];
        message.text = message.content;

        if (message.type == 'text/plain') {
            message.type = 'message_received';
        }
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
    controller.createWebhookEndpoints = (bot, cb) => {


        bot.connect.addMessageReceiver(() => true, (message) => {
            controller.ingest(bot, message, null);
        })

        if (cb) {
            cb();
        }

        return controller;
    };

    sleep = (ms) =>{
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    controller.sendTyping = async (bot, message, time) => {

        bot.reply(message, {
            type: "application/vnd.lime.chatstate+json",
            content: {
                "state": "composing"
            }
        })

        await sleep(time);

        bot.reply(message, {
            type: "application/vnd.lime.chatstate+json",
            content: {
                "state": "starting"
            }
        })
    }


    return controller;

}