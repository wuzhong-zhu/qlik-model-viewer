var express = require('express');
var serveStatic = require('serve-static');
var open = require('open');

var app = express();
app.use(express.static(__dirname));
app.listen(process.env.PORT || 8888)
