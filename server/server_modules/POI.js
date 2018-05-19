var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var morgan = require('morgan');



router.get('/', function (req, res) {

    

    res.send ( {message: 'Welcome to area for registered users only!!'})


});



module.exports = router;