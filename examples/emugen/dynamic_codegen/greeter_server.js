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
 * Implements the SayHello RPC method.
 */
function sayHello(call, callback) {
  callback(null, {message: 'Hello ' + call.request.name + ' from ' + call.call.handler.path});
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
  var server = new grpc.Server();
  server.addService(hello_proto.Greeter.service, {sayHello: sayHello});
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    server.start();
  });
  var httpServer = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index());
  });
  const wss = new ws.WebSocketServer({ server: httpServer });

  wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
  
    ws.on('message', function message(data) {
      console.log('received: %s', data);
    });
  
    ws.send('something');
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
      const webSocket = new WebSocket('ws://localhost:8080/');
      webSocket.onmessage = (event) => {
        console.log(event)
        document.getElementById('messages').innerHTML += 
          'Message from server: ' + event.data + "<br>";
      };
      webSocket.addEventListener("open", () => {
        console.log("We are connected");
      });
      function sendMessage(event) {
        var inputMessage = document.getElementById('message')
        webSocket.send(inputMessage.value)
        inputMessage.value = ""
        event.preventDefault();
      }
      document.getElementById('input-form').addEventListener('submit', sendMessage);
    </script>
  </body>
  </html>`
}