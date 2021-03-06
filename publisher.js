var amqp = require('amqplib/callback_api');
const uri = ""; //Provide  rabbitmq connection uri
const filedownloadurl = ""; //provide file download url
const publishqueuename = ""; //provide publish queue name
const consumerqueuename = ""; //provide response queue name. consumer should be listening to this

// if the connection is closed or fails to be established at all, we will reconnect
var amqpConn = null;
function start() {
    if (uri == '' || filedownloadurl == '' || publishqueuename == '' || consumerqueuename == '') {
        console.log(`MIssing config values uri ${uri}, filedownloadurl ${filedownloadurl}, 
        publishqueuename ${publishqueuename}, consumerqueuename ${consumerqueuename}`);
        return true;
    }
    amqp.connect(uri, function (err, conn) {
        if (err) {
            console.error("[AMQP Error]", err);

        } else {
            conn.on("error", function (err) {
                if (err.message !== "Connection closing") {
                    console.error("[AMQP] conn error", err.message);
                }
            });
            conn.on("close", function () {
                console.error("[AMQP] reconnecting");
            });
        }
        console.log("[AMQP] connected");
        amqpConn = conn;

        startPublisher();
    });
}


var pubChannel = null;
var offlinePubQueue = [];
function startPublisher() {
    amqpConn.createConfirmChannel(function (err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function (err) {
            console.error("[AMQP] channel error", err.message);
        });
        ch.on("close", function () {
            console.log("[AMQP] channel closed");
        });


        pubChannel = ch;
        while (true) {
            var m = offlinePubQueue.shift();
            if (!m) break;
            publish(m[0], m[1], m[2]);

        }
    });
}

// method to publish a message, will queue messages internally if the connection is down and resend later
function publish(queue, content) {
    try {
        pubChannel.sendToQueue(queue, content, {
            persistent: true,
            contentType: "application/json"
        }, function (err, ok) {
            if (err !== null) console.warn('Message nacked!');
            else console.log('Message acked');

        });
        // pubChannel.publish(exchange, routingKey, content, {
        //     persistent: true,
        //     contentType: "application/json"
        // },
        //     function (err, ok) {
        //         if (err) {
        //             console.error("[AMQP] publish", err);
        //             offlinePubQueue.push([exchange, routingKey, content]);
        //             pubChannel.connection.close();
        //         }
        //     });
    } catch (e) {
        console.error("[AMQP] publish", e.message);
        offlinePubQueue.push([exchange, routingKey, content]);
    }
}



function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}

const request = Buffer.from(JSON.stringify({
    "sourceUrls": [
        filedownloadurl
    ],
    "responseQueue": consumerqueuename
}));

setTimeout(function () {
    publish(publishqueuename, request);
}, 5000);

start();

//set property: content_type = application/json 
