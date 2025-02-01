import mongoose from "mongoose";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { WebSocketServer } from 'ws';

// Create a WebSocket server on port 3000
const wss = new WebSocketServer({ port: 3000 });
import { createClient } from 'redis';
const app = express()
const port = 3001
app.use(cors());
app.use(bodyParser.json())
let conn = await mongoose.connect("mongodb://localhost:27017/Stocks");
const stocks = mongoose.connection.collection('stockproperties');
let sendInterval = null;
const client = createClient();
client.on('error', (err) => console.log('Redis Client Error', err));
await client.connect();

// Store each product as a separate hash
/*for (const [index, product] of products.entries()) {
  await client.hSet(`product:${product.name}`, 'name', product.name);
  await client.hSet(`product:${product.name}`, 'price', product.price);
}*/
const special = ['Grapes', 'Pineapple'];
const productKeys = await client.keys('product:*');
console.log('Products stored as hashes in Redis');

let server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.get('/Stock/:stockName', async(req, res) => {
  console.log(`Received stock request : ${req.params.stockName}`)
  let stock = await stocks.find({ shortname: req.params.stockName }).toArray();
  console.log(stock)
  if (stock != null)
      res.json(stock[0])
  else {
      res.json({
          fullname: "Not found",
          description: "Please verify your search"
      })
  }
})
  
/*setInterval(async()=>
{
  console.log("Updating...");
  for (const key of productKeys) {
    const product = await client.hGetAll(key);
    await client.hSet(key, 'price', parseInt(product.price)+1);
    console.log(product.price)
  }
},3000)*/
wss.on('connection', function connection(ws) {
  console.log('Client connected');
  ws.on('message', async function incoming(message) {
    console.log('Received: %s', message);
    if(message=="home"){
    sendInterval = setInterval(async () => {
      const products = [];
      for (const key of productKeys) {
        const product = await client.hGetAll(key);
        console.log(product.price)
        if (special.includes(product.name))
          products.push(product);
      }
      ws.send(JSON.stringify(products))
    }, 3000);
  }
  else
  {
    sendInterval = setInterval(async () => {
      const product = await client.hGetAll(`product:${message.toString()}`);
      ws.send(JSON.stringify(product))
    }, 3000);
  }
  })
  ws.on('close', async function close() {
    console.log('Client disconnected');
    clearInterval(sendInterval);
  });
})