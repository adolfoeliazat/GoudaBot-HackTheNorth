const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
const bodyParser = require('body-parser');
const goudaBot = require('./lib/gouda-bot');
const path = require('path');

const public = `${__dirname}/public`;
var app = express();
var userStates = {};

app.use(bodyParser());
app.use(express.static(public));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(public, "index.html"));
});

app.get('/services', (req, res) => {
  res.sendFile(path.resolve(public, "services.html"));
});

app.get('/policy', (req, res) => {
  res.sendFile(path.resolve(public, "policy.html"));
});

app.get('/info', (req, res) => {
  res.sendFile(path.resolve(public, "info.html"));
});

app.get('/webhook', (req, res) => {
  console.log(req.query, 'hihihi', process.env.verify_token)
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.verify_token) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});

app.post('/webhook', (req, res) => {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var timeOfEvent = pageEntry.time;
      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.message) {
          goudaBot.receivedMessage(messagingEvent, userStates);
        }  else if (messagingEvent.postback) {
          goudaBot.receivedPostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

if (!process.env.CERT_PATH) {
	console.log('cert path is not present')
	process.exit()
}

var certOptions = {
  key: fs.readFileSync(`${process.env.CERT_PATH}privkey.pem`),
  cert: fs.readFileSync(`${process.env.CERT_PATH}cert.pem`),
  ca: fs.readFileSync(`${process.env.CERT_PATH}chain.pem`)
};

https.createServer(certOptions, app).listen(443, () => {
    console.log("Server started");
});

// Redirect from http port 80 to https
http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);
