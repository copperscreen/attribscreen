let express = require('express');
let process = require('./process.js');

var app = express();
app.use(express.json({limit:"100000kb"}));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});
app.get(['/htm.module.js', '/preact.module.js'], function(req, res){
	res.sendFile(__dirname + req.path, {'headers': 'text/javascript'});
});
app.post('/', async function(req, res){
	let {mime, encoded} = await process(req.body);
	res.set('Content-Type', mime);
	res.send(encoded);
});
console.log('Starting server on http://localhost:3000');
app.listen(3000);
