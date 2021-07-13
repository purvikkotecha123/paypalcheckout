const express = require("express");
const session = require('express-session');
const https = require('https');
const { stringify } = require("querystring");


const PORT = process.env.PORT || 3000;

const app = express();
app.use(session({secret: 'ssshhhhh',saveUninitialized: true,resave: true}));
app.use(express.urlencoded({
  extended: true
}));
let sess;
app.get('/', (req, res) => {
  sess = req.session;
  sess.order_id;
  res.sendFile(__dirname +  '/index.html');
});

const get_oauth = () => {
  return new Promise(resolve => {
      console.log('In Auth');
      const data = 'grant_type=client_credentials';

      const options = {
        hostname: 'api.sandbox.paypal.com',
        path: '/v1/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': data.length,
          'Authorization': 'Basic ' + Buffer.from('AYTWSduEpqb-EXuqWNDhjA0sl863oNk18atZNPhf8AUq0piPACNP8iREsiNiFUhuFsfvUuWHFdVyAvtq:ED8yOif4HPWSq9dhLy1Ida4py_G1kNxjxkYrXj4Z2iSF5ZjkCq57D9rx8DUFGOEQbERfMUQFL50Qqj9Q').toString('base64')
        }
      }
      const my_callback = function(res){

        let str='';

        res.on('data',function(chunk){
            str+=chunk;
        });

        res.on('end',function(){
            obj=JSON.parse(str);
            console.log("logging here get access token"+JSON.stringify(obj));
            resolve(obj);
        });
      }
      let request = https.request(options, my_callback);
      request.write(data);
      request.end();

    });
};
const get_access_token = () => {
  return new Promise(resolve => {
    get_oauth().then((response) => {
      resolve(response.access_token);
    });
  });
};
const create_order = (item_obj) => {
  return new Promise(resolve => {
    get_access_token().then((access_token) => {
      console.log('access token'+access_token);
    const options = {
      hostname: 'api.sandbox.paypal.com',
      path: '/v2/checkout/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    }
    const my_callback = function(res){

      let str='';

      res.on('data',function(chunk){
          str+=chunk;
      });

      res.on('end',function(){
         let obj=JSON.parse(str);
         console.log("logging here create order response"+JSON.stringify(obj));
         resolve(obj);
      });
      
    }
    let request = https.request(options,my_callback);
    request.write(JSON.stringify(item_obj));
    request.end();
    
  });

  });
};

const capture_order = (order_id) => {
  return new Promise(resolve => {
    get_access_token().then((access_token) => {
      console.log ("Capture Order");
      console.log("Final step"+order_id);
    const options = {
      hostname: 'api.sandbox.paypal.com',
      port: 443,
      path: '/v2/checkout/orders/' + order_id + '/capture',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token,
        'return': 'representation',
        'PayPal-Partner-Attribution-Id': 'PP-DemoPortal-Checkout-NodeJS-SDK'
      }
    }
    const my_callback = function(res){
      let str='';
      res.on('data',function(chunk){
          str+=chunk;
      });
      res.on('end',function(){
          obj=JSON.parse(str);
          console.log("logging here capture order response"+JSON.stringify(obj));
          resolve(obj);
      });
    }
    let request = https.request(options,my_callback);
    request.end();
    });
  });
};

app.post("/api/createOrder", (req, res) => {
  const item_obj = {
    "intent" : "CAPTURE",
    "purchase_units" : [ 
        {
            "reference_id" : "ABC",
            "amount" : {
                "currency_code" : "USD",
                "value" : "1",
            }
        }
    ]
  };

  create_order(item_obj).then((response) => {
    console.log("response.id: " + response.id);
    sess.order_id = response.id;
    res.send(response);
  });
});

app.post("/api/captureOrder", (req, res) => {

  capture_order(sess.order_id).then((response) => {
    res.send(response);
  });



});

app.get('/success', (req, res) => {
  res.sendFile(__dirname +  '/success.html');
});

app.get('/cancel', (req, res) => {
  res.sendFile(__dirname +  '/cancel.html');
});

app.listen(PORT, () => console.log(`Server Started on ${PORT}`));
