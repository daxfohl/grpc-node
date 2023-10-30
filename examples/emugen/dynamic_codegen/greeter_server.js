/*
 *
 * Copyright 2015 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var PROTO_PATH = __dirname + '/../../protos/helloworld.proto';

var http = require('http');
var ws = require('ws');
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });
var hello_proto = grpc.loadPackageDefinition(packageDefinition).helloworld;

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
  wsClients = [];
  const httpServer = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index());
  });
  const wss = new ws.WebSocketServer({ server: httpServer, clientTracking: true });
  const grpcServer = new grpc.Server();
  grpcServer.addService(hello_proto.Greeter.service, {sayHello: (call, callback) => {
    console.log('sayhello');
    if (wsClients.length == 0) {
      callback(null, {message: 'Hello ' + call.request.name + ' from ' + call.call.handler.path});
      console.log('saidhello');
    } else {
      const ws = wsClients[0];
      console.log(JSON.stringify(wss.clients));
      console.log('sending to chrome');
      ws.send(JSON.stringify(call));
      console.log('sent to chrome');
      ws.addEventListener('message', (ev) => {
        console.log('from listener');
        console.log(ev.data);
        callback(null, {message: 'Hello ' + call.request.name + ' from ' + call.call.handler.path});
        console.log('saidhello');
      }, {once: true});
      console.log('saying hello');
    }
  }});
  grpcServer.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    grpcServer.start();
  });

  wss.on('connection', function connection(ws) {
    wsClients.push(ws);
    ws.on('error', console.error);
    ws.on('close', () => {
      console.log('closing ');
      const i = wsClients.indexOf(ws);
      console.log('closing ' + i);
      wsClients.splice(i, 1);
    });
  });
  httpServer.listen(8080);
}

main();

function index() {
  return `<html>
  <head>
  </head>
  <body>
    <form id="input-form">
      <label for="message">Enter Message:</label>
      <input type="text" id="message" name="message"><br><br>
      <input type="submit" value="Send">
    </form>
    <div id="messages"></div>
    <script>
      const ws = new WebSocket('ws://localhost:8080/');
      ws.onmessage = (event) => {
        console.log(event);
        document.getElementById('messages').innerHTML += 'Message from server: ' + event.data + "<br>";
        var o = JSON.parse(event.data);
        console.log(o);
        if (o.call.handler.path == '/helloworld.Greeter/SayHello') {
          console.log('sending back');
          ws.send(o.request.name + ' intercepted');
          console.log('sent back');
        }
      };
      ws.addEventListener("open", () => {
        console.log("We are connected");
      });
      function sendMessage(event) {
        var inputMessage = document.getElementById('message')
        ws.send(inputMessage.value)
        inputMessage.value = ""
        event.preventDefault();
      }
      document.getElementById('input-form').addEventListener('submit', sendMessage);
    </script>
  </body>
  </html>`
}