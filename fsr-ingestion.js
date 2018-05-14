const fs = require('fs');
var base64 = require('file-base64');
var request = require('request');
var base_url = 'http://fsstpapi-399122633.us-east-1.elb.amazonaws.com/api/product_api/minimal_font/';

function startIngestion() {
    console.log('Run using arguments : {File path} {md5}');
    if (process.argv[2] == null) {
        console.log('file path required');
        return;
    }
    if (process.argv[3] == null) {
        console.log('MD5 required');
        return;
    }

    request.get(process.argv[2], function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
            var url = base_url + process.argv[3];
            var base_64 = new Buffer(body).toString('base64');
            var post_data = {
                'language_script': "en",
                'fonttype_safename': "fontuploaded",
                'font_data': base_64
            };

            var options = {
                uri: url,
                method: 'PUT',
                json: post_data,
                auth: {
                    'user': '*****',
                    'pass': '*****',
                    'sendImmediately': false
                },
                headers: {
                    'content-type': 'aaplication/json',
                    'content-length': JSON.stringify(post_data).length
                }
            };

            request(options, function (error, response, body) {
                if (error) {
                    console.log(response);
                    console.log(body);
                    console.log(error);
                } else {
                    console.log("loaded to fsr: ");
                }
            });

        }
    });


}

startIngestion();