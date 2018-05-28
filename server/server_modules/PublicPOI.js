var express     = require('express');
var router      = express.Router();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var dbutils     = require('../DButils');
var util        = require('util');


router.get('/', function(req,res){
    var sQuery = "select * from poi"
    var ans = dbutils.execQuery(sQuery);
    ans.then(
        oData => {
            if (oData.result.length) {
                res.status(200).send(oData.result);
            } else {
                res.status(400).send({success: false, message: err});
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

router.get('/:id', function(req, res){
    var sTemplate = "select * from poi where pid='%s'";
    var sQuery = util.format(sTemplate, req.param('id'));

    var ans = dbutils.execQuery(sQuery);
    ans.then(
        oData => {
            if (oData.result.length) res.json(oData.result[0]);
            else res.json({success: true, message: 'No such POI. Invalid ID ' + req.param('id')})
        }
    ).catch(
        err => {
            res.status(400).send({message: false, error: err});
        }
    )
})

module.exports = router;