var express     = require('express');
var router      = express.Router();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var dbutils     = require('../DButils');
var util        = require('util');


router.get('/', function (req, res) {

    

    res.send ( {message: 'Welcome to area for registered users only!!'})


});

router.post('/addreview', function (req, res) {

    if (!req.body.PID || !req.body.Rating || !req.body.ReviewText){
        res.json({success: false, message: 'Bad input'});
    } else {
        var sTemplate = "INSERT INTO Review (Username, PID, ReviewText, Rating, Date) VALUES('%s', '%s', N'%s', '%s', '%s')";
        var sQuery = util.format(sTemplate,
            req.decoded.payload.Username,
            req.body.PID,
            req.body.ReviewText,
            req.body.Rating,
            dbutils.getDate()
        );

        var ans = dbutils.execQuery(sQuery);
        ans.then(
            oData => {
                if (oData.count){
                    res.status(200).send({success: true});
                } else {
                    res.status(400).send({success: false});
                }
            }
        ).catch(
            err => {
                res.status(400).send(err);
            }
        )
    }

});

router.get('/lastsaved', function(req,res) {
    var sTemplate = "select * from poi where PID IN (select top 2 PID from favpoi where Username='%s' order by datesaved desc)";
    var sQuery = util.format(sTemplate, req.decoded.payload.Username);
    var ans = dbutils.execQuery(sQuery);

    ans.then(
        oData => {
            if (oData.result.length){
                res.json(oData.result);
            } else {
                res.json({message: "You haven't saved any POIs yet."});
            }
        }
    ).catch(
        err => {
            res.status(400).send(err);
        }
    )
});

router.post('/setfav', function(req, res){
    var fnErr = err => res.status(400).send(err);

    if (req.body.pois && req.body.pois.length){
        var toDelete = [];
        var toAdd = [];
        var sTemplate;
        req.body.pois.forEach(
            oPoi => {
                if (!oPoi.isFavorite) toDelete.push(oPoi);
                else toAdd.push(oPoi);
            }
        );

        var delQuer = "delete from favpoi where Username='" + req.decoded.payload.Username + "' AND PID IN (";
        toDelete.forEach(
            (oPoi, idx) => {
                delQuery += oPoi.PID;
                if (idx !== toDelete.length) delQuery += ", ";
                else delQuery += ");";
            }
        );

        var addQuery = "insert into favpoi (Username, PID, Order, DateSaved) values";
        var auxDBQuery = dbutils.execQuery("select max([Order]) as [Order] from favpoi where Username='" + req.decoded.payload.Username + "'");
        auxDBQuery.then(
            oData => {
                var orderCounter = oData.result[0].Order;

                toAdd.forEach(
                    (oPoi, idx) => {
                        addQuery += "('%s', '%s', '%s',"+ dbutils.getDate() +")"
                        if (idx!==toAdd.length) addQuery += ", "
                        else addQuery += ";";
                    }
                )
            }
        ).catch(fnErr);
    }
});


module.exports = router;