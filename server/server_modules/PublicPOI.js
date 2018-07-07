var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var dbutils = require('../DButils');
var util = require('util');
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens

const superSecret = "SUMsumOpen"; // secret variable

router.use('/', function (req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, superSecret, function (err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                // get the decoded payload and header
                req.decoded = jwt.decode(token, { complete: true });

                console.log(decoded.header);
                console.log(decoded.payload);

                next();
            }
        });

    } else next();
})

router.get('/', function (req, res) {

    var sQuery;

    if (req.decoded && req.decoded.payload && req.decoded.payload.Username) {
        sQuery = util.format("select poi.PID as PID, [Views], Title, [Description], Category, Rating, Raters, ImageFileName, Username, [Order], DateSaved from poi left join (select * from favpoi where Username='%s') as foo on poi.pid=foo.pid", req.decoded.payload.Username);
    } else {
        sQuery = "select * from poi"
    }

    var ans = dbutils.execQuery(sQuery);
    ans.then(
        oData => {
            dbutils.calcFavorite(oData);
            if (oData.result.length) {
                res.status(200).send(oData.result);
            } else {
                res.status(400).send({ success: false, message: err });
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
            if (oData.result.length <= 3) {

                res.json(oData.result);
            } else {
                var aPopulars = oData.result.filter(
                    (elem, idx) => {
                        var rating = elem.Rating;
                        return rating >= 0; //CHANGE AFTER POIS HAVE REAL RATINGS!!!!!!!!!!!!!!!!
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

router.get('/:id', function (req, res) {

    var sQuery;

    if (req.decoded && req.decoded.payload && req.decoded.payload.Username) {
        sQuery = util.format("select poi.PID as PID, [Views], Title, [Description], Category, Rating, Raters, ImageFileName, Username, [Order], DateSaved, Longitude, Latitude from poi left join (select * from favpoi where Username='%s') as foo on poi.pid=foo.pid where poi.pid=%s", req.decoded.payload.Username, req.param('id'));
    } else {
        sQuery = util.format("select * from poi where pid='%s'", req.param('id'));
    }

    var sQuery2 = util.format("update poi set [Views]=(select [Views] from poi where pid=%s)+1 where pid=%s", req.param('id'), req.param('id'));

    var ans = dbutils.execQuery(sQuery);
    var ans2 = dbutils.execQuery(sQuery2);
    Promise.all([ans, ans2]).then(
        aData => {
            var oData = aData[0];
            dbutils.calcFavorite(oData);
            if (oData.result.length) res.json(oData.result[0]);
            else res.json({ success: true, message: 'No such POI. Invalid ID ' + req.param('id') })
        }
    ).catch(
        err => {
            res.status(400).send({ message: false, error: err });
        }
        )
})

router.get('/:id/lastreviews', function (req, res) {
    var sTemplate = "select top 2 * from review where pid=%s order by date desc";
    var sQuery = util.format(sTemplate, req.param('id'));
    var ans = dbutils.execQuery(sQuery);

    ans.then(
        oData => {
            if (oData.result.length) res.json(oData.result);
            else res.json({ success: false, message: 'No reviews found for POI with ID ' + req.param('id') });
        }
    ).catch(
        err => {
            res.status(400).send({ success: false, message: err });
        }
        )
})

module.exports = router;