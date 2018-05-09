var amqp = require('amqplib/callback_api');
// if the connection is closed or fails to be established at all, we will reconnect
var amqpConn = null;
function start() {
    amqp.connect("amqp://guest:guest@rabbitmq-test-rabbitmq-1493687737.us-east-1.elb.amazonaws.com:5672?heartbeat=60", function (err, conn) {
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

        startWorker();
    });
}
// A worker that acks messages only if processed succesfully

 function startWorker() {
    amqpConn.createChannel(function (err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error",  (err) =>{
            console.error("[AMQP] channel error", err.message);
        });
        ch.on("close",  ()=> {
            console.log("[AMQP] channel closed");
        });
        ch.prefetch(10);
        ch.assertQueue("mosaic.test.fontanalysis-result", { durable: true },  (err, _ok) =>{
            if (closeOnErr(err)) return;
            ch.consume("mosaic.test.fontanalysis-result", processMsg, { noAck: false }, (err,ok)=>{ 
                console.log(ok);});
            console.log("Worker is started");
        });

        function processMsg(msg) {
            work(msg, function (ok) {
                try {
                    if (ok)
                        ch.ack(msg);
                    else
                        ch.reject(msg, true);
                } catch (e) {
                    closeOnErr(e);
                }
            });
        }
    });
}

function work(msg, cb) {
    console.log("Message received: ", msg.content.toString());
    cb(true);
}

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}
 start();