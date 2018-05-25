var express     = require('express');
var router      = express.Router();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var dbutils     = require('../DButils');
var util        = require('util');

//handlers go here

router.get('/', function(req,res){
    var sQuery = "select * from poi"
    var ans = dbutils.execQuery(sQuery);
    ans.then(
        oData => {
            if (oData.result.length) {
                res.status(200).send(oData.result);
            } else {
                res.status(400).send({success: false});
            }
        }
    ).catch(
        err => {
            res.status(400).send(err);
        }
    )
});

router.get('/footer', function (req, res) {
    var sQuery = "select * from poi";
    var ans = dbutils.execQuery(sQuery);

    ans.then(
        oData => {
            if (oData.result.length <= 3){
                res.json(oData.result);
            } else {
                var aPopulars = oData.result.filter(
                    (elem, idx) => {
                        var rating = elem.Rating / elem.Raters;
                        return rating > 3;
                    }
                );

                if (aPopulars.length <= 3) res.json(aPopulars);
                else res.json(getRandom(aPopulars, 3));
            }
        }
    ).catch(
        err => res.status(400).send(err)
    )
});

function getRandom(arr, n) {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

module.exports = router;