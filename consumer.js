var amqp = require('amqplib/callback_api');
var fs = require('fs');


const uri = "";
const consumerqueuename = "";
// if the connection is closed or fails to be established at all, we will reconnect
var amqpConn = null;
function start() {
    if(uri == '' || consumerqueuename ==''){
        console.log(`Missing config values uri ${uri}, consumerqueuename ${consumerqueuename}`);
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
        ch.assertQueue(consumerqueuename, { durable: true },  (err, _ok) =>{
            if (closeOnErr(err)) return;
            ch.consume(consumerqueuename, processMsg, { noAck: false }, (err,ok)=>{ 
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
    console.log("Message received writing to file metadata.json: ");
    fs.writeFile("metadata.json", msg.content.toString(), function(err) {
        if(err) {
            return console.log(err);
        }
    
        console.log("The file was saved!");
    }); 
    cb(true);
}

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}
 start();