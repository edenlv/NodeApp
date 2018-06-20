var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var dbutils = require('../DButils');
var util = require('util');


router.get('/', function (req, res) {
    res.send({ message: 'Welcome to area for registered users only!!' })
});



router.post('/addreviewtext', function (req, res) {
    if (!req.body.ReviewText) res.status(400).send({ success: false, message: 'No review text provided' });
    else {
        var preQuery = util.format("select * from review where Username='%s' and pid=%s", req.decoded.payload.Username, req.body.PID);
        dbutils.execQuery(preQuery).then(
            preData => {

                var sQuery1;

                if (preData.result.length) {
                    sQuery1 = util.format("update review set ReviewText='%s' where id=%s", req.body.ReviewText, preData.result[0].ID);
                } else {
                    sQuery1 = util.format("INSERT INTO Review (Username, PID, ReviewText, Date) VALUES('%s', '%s', N'%s', '%s')",
                        req.decoded.payload.Username,
                        req.body.PID,
                        req.body.ReviewText,
                        dbutils.getDate()
                    );
                }



                dbutils.execQuery(sQuery1).then(
                    oData => {
                        if (oData.count) res.json({ success: true });
                        else res.status(400).send({ success: false });
                    }
                ).catch(err => res.status(400).send({ success: false, error: err }))

            }
        )
    }
});

router.post('/addrating', function (req, res) {
    if (!req.body.Rating) res.status(400).send({ success: false, message: 'No Rating provided' });
    else {
        var preQuery = util.format("select * from review where Username='%s' and pid=%s", req.decoded.payload.Username, req.body.PID);
        dbutils.execQuery(preQuery).then(
            preData => {

                var sQuery1;

                if (preData.result.length) {
                    sQuery1 = util.format("update review set Rating='%s' where id=%s", req.body.Rating, preData.result[0].ID);
                } else {
                    sQuery1 = util.format("INSERT INTO Review (Username, PID, Rating, Date) VALUES('%s', '%s', %s, '%s')",
                        req.decoded.payload.Username,
                        req.body.PID,
                        req.body.Rating,
                        dbutils.getDate()
                    );
                }

                var sTemplate2 = "update poi set Rating=(((select Rating from poi where pid=%s)*(select Raters from poi where pid=%s))+%s)/((select Raters from poi where pid=%s)+1), " +
                    "Raters=(select Raters from poi where pid=%s)+1 where pid=%s";
                var sQuery2 = util.format(sTemplate2, req.body.PID, req.body.PID, req.body.Rating, req.body.PID, req.body.PID, req.body.PID);

                var sQuery = "BEGIN TRANSACTION; " + sQuery1 + "; " + sQuery2 + "; COMMIT";

                var ans = dbutils.execQuery(sQuery);
                ans.then(
                    oData => {
                        if (oData.count) {
                            res.json({ success: true });
                        } else {
                            res.status(400).send({ success: false, message: err });
                        }
                    }
                ).catch(
                    err => {
                        res.status(400).send(err);
                    }
                    )

            }
        )
    }
});

router.get('/lastsaved', function (req, res) {
    var sTemplate = "select * from poi where PID IN (select top 2 PID from favpoi where Username='%s' order by datesaved desc)";
    var sQuery = util.format(sTemplate, req.decoded.payload.Username);
    var ans = dbutils.execQuery(sQuery);

    ans.then(
        oData => {
            if (oData.result.length) {
                oData.result.forEach(
                    (elem,idx) => {
                        elem.isFavorite = true;
                    }
                )
                res.json(oData.result);
            } else {
                res.json({ message: "You haven't saved any POIs yet." });
            }
        }
    ).catch(
        err => {
            res.status(400).send(err);
        }
        )
});

router.get('/favlist/count', function (req, res) {
    var sQuery = util.format("select count(pid) as Count from favpoi where username='%s'", req.decoded.payload.Username);
    var ans = dbutils.execQuery(sQuery);

    ans.then(
        oData => {
            if (oData.result && oData.result.length) res.json(oData.result[0]);
            else res.status(400).send({ success: false, message: err });
        }
    ).catch(
        err => {
            res.status(400).send({ success: false, message: err });
        }
        );

});

router.post('/setfavorder', function (req, res) {
    var username = req.decoded.payload.Username;

    if (req.body && req.body.length) {
        var sTemplateStart = "UPDATE favpoi SET [Order] = CASE [PID] ";
        var sTemplateMid = "";
        req.body.forEach(
            (elem, idx) => {
                sTemplateMid += util.format(" WHEN %s THEN %s", elem, idx);
            }
        );
        var sTemplateEnd = util.format(" ELSE [Order] END WHERE Username='%s'", username);

        var sQuery = sTemplateStart + sTemplateMid + sTemplateEnd;
        var ans = dbutils.execQuery(sQuery);

        ans.then(
            oData => {
                if (oData.count === req.body.length) res.json({ success: true });
                else res.status(400).send({ success: false, message: "Request array length and DB answer row count do not match!" });
            }
        ).catch(
            err => {
                res.status(400).send({ success: false, message: err });
            }
            );
    }
});

router.get('/recommended', function (req, res) {
    var sTemplate = "select * from poi where pid="
        + "(SELECT top 1 PID FROM POI WHERE PID NOT IN (select pid from favpoi where Username='%s') and Category=(SELECT Category FROM (SELECT ROW_NUMBER() OVER (ORDER BY Category ASC) AS rownumber, Category FROM UserCategory where Username='%s') as foo where rownumber = 1) order by Rating desc)"
        + "OR pid="
        + "(SELECT top 1 PID FROM POI WHERE PID NOT IN (select pid from favpoi where Username='%s') and Category=(SELECT Category FROM (SELECT ROW_NUMBER() OVER (ORDER BY Category ASC) AS rownumber, Category FROM UserCategory where Username='%s') as foo where rownumber = 2) order by Rating desc)";


    var sQuery = util.format(sTemplate, req.decoded.payload.Username, req.decoded.payload.Username, req.decoded.payload.Username, req.decoded.payload.Username);

    var ans = dbutils.execQuery(sQuery);

    ans.then(
        oData => {
            if (oData.count > 0) {
                oData.result.forEach(
                    (elem, idx) => {
                        elem.isFavorite = false;
                    }
                )
                res.json(oData.result);
            }
            else res.status(400).send({ success: false, message: "Could not find recommended POIs for you." });
        }
    ).catch(
        err => {
            res.status(400).send({ success: false, message: err });
        }
        );
});

router.get('/favlist', function (req, res) {
    var sTemplate = "select poi.PID, [Views], Title, [Description], Category, Rating, Raters, [Order] from poi, favpoi where Username='%s' and poi.pid=favpoi.pid order by [Order]";
    var sQuery = util.format(sTemplate, req.decoded.payload.Username);
    var ans = dbutils.execQuery(sQuery);

    ans.then(
        oData => {
            if (oData.result.length) res.json(oData.result);
            else res.json({ success: true, message: "No favorite POIs were saved." });
        }
    ).catch(
        err => {
            res.status(400).send({ success: false, error: err })
        }
        )
});

router.post('/setfavs', function (req, res) {
    var delQuery = "delete from favpoi where Username='" + req.decoded.payload.Username + "' AND PID IN (";
    var addQuery = "insert into favpoi (Username, PID, [Order], DateSaved) values";

    if (req.body && req.body.length) {
        var hasAdd = false, hasDel = false;

        req.body.forEach(
            (elem, idx) => {
                if (elem.isFavorite) {
                    addQuery += util.format(
                        "('%s', '%s', '%s', '%s'),",
                        req.decoded.payload.Username,
                        elem.PID,
                        50,
                        dbutils.getDate()
                    );
                    hasAdd = true;
                } else {
                    delQuery += util.format("'%s',", elem.PID);
                    hasDel = true;
                }
            }
        )

        var sQuery = "BEGIN TRANSACTION; ";

        if (hasDel) delQuery = delQuery.slice(0, delQuery.lastIndexOf(',')) + ")";
        if (hasAdd) addQuery = addQuery.slice(0, addQuery.lastIndexOf(',')) + "";

        if (hasDel) sQuery += delQuery + "; ";
        if (hasAdd) sQuery += addQuery + "; ";

        sQuery += " COMMIT";

        var ans = dbutils.execQuery(sQuery);

        ans.then(
            oData => {
                if (oData.count === req.body.length) {
                    res.json({ success: true, message: "Successfully set favorite POIs" });
                }
                else {
                    res.json({ success: false });
                }
            }
        ).catch(
            err => {
                res.status(500).send({ success: false, error: err });
            }
            )
    }

});

// router.post('/addreview', function (req, res) {
    
//         if (!req.body.PID || !req.body.Rating || !req.body.ReviewText) {
//             res.json({ success: false, message: 'Bad input' });
//         } else {
    
//             var sTemplate = "INSERT INTO Review (Username, PID, ReviewText, Rating, Date) VALUES('%s', '%s', N'%s', '%s', '%s')";
//             var sQuery1 = util.format(sTemplate,
//                 req.decoded.payload.Username,
//                 req.body.PID,
//                 req.body.ReviewText,
//                 req.body.Rating,
//                 dbutils.getDate()
//             );
    
    
//             var sTemplate2 = "update poi set Rating=(((select Rating from poi where pid=%s)*(select Raters from poi where pid=%s))+%s)/((select Raters from poi where pid=%s)+1), " +
//                 "Raters=(select Raters from poi where pid=%s)+1 where pid=%s";
//             var sQuery2 = util.format(sTemplate2, req.body.PID, req.body.PID, req.body.Rating, req.body.PID, req.body.PID, req.body.PID);
    
//             var sQuery = "BEGIN TRANSACTION; " + sQuery1 + "; " + sQuery2 + "; COMMIT";
    
//             var ans = dbutils.execQuery(sQuery);
//             ans.then(
//                 oData => {
//                     if (oData.count) {
//                         res.status(200).send({ success: true });
//                     } else {
//                         res.status(400).send({ success: false, message: err });
//                     }
//                 }
//             ).catch(
//                 err => {
//                     res.status(400).send(err);
//                 }
//                 )
//         }
    
//     });


// router.post('/setfav', function(req,res){
//     var username = req.decoded.payload.Username;
//     var fnError = err => res.status(400).send(err);

//     if (req.body){
//         if (req.body.isFavorite === false){

//             var sTemplate = "delete from favpoi where Username='%s' and pid=%s";
//             var sQuery = util.format(sTemplate, username, req.body.PID);
//             var ans = dbutils.execQuery(sQuery);

//             ans.then(
//                 oData => {
//                     if (oData.count) res.json({success: true});
//                     else res.status(400).send({success: false, message: err});
//                 }
//             ).catch(err => res.status(400).send(err));

//         } else {

//             var sTemplate = "insert into favpoi (Username, PID, [Order], DateSaved) values('%s', '%s', '%s', '%s')";
//             var auxQuery = util.format("select max([Order]) as maxOrder from favpoi where Username='%s'", username);
//             var auxAns = dbutils.execQuery(auxQuery);
//             auxAns.then(
//                 oData => {
//                     var nextOrder = oData.result[0].maxOrder + 1;
//                     var sQuery = util.format(sTemplate, username, req.body.PID, nextOrder, dbutils.getDate());
//                     var ans = dbutils.execQuery(sQuery);

//                     ans.then(
//                         oData => {
//                             if (oData.count) res.json({success: true, message: util.format("POI Number %s was added to favorites!", req.body.PID)});
//                             else res.status(400).send({success: false, message: "Could not add to favorites"});
//                         }
//                     ).catch(
//                         err => {
//                             res.status(400).send({success: false, message: err});
//                         }
//                     );
//                 }
//             ).catch(
//                 err => {
//                     res.status(400).send({success: false, message: err});
//                 }
//             );

//         }
//     }

// });


module.exports = router;