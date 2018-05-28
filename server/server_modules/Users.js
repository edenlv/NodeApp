var express     = require('express');
var router      = express.Router();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var jwt         = require('jsonwebtoken'); // used to create, sign, and verify tokens
var dbutils     = require('../DButils');
var util        = require('util');



const superSecret = "SUMsumOpen"; // secret variable



/**
 * Register new account
 */
router.post('/', function (req, res) {

    if (!isInputValid(req, res)) res.status(400).send({success: false, message: "INVALID INPUT. User was not created"});

    var sTemplate = "INSERT INTO [User](Username, Password, FirstName, LastName, City, Country, Question, Answer, Question2, Answer2, Email)"
                + " VALUES('%s', '%s', N'%s', N'%s', N'%s', N'%s', N'%s', N'%s', '%s')";
    var sQuery1 = util.format(sTemplate,
        req.body.Username,
        req.body.Password,
        req.body.FirstName,
        req.body.LastName,
        req.body.City,
        req.body.Country,
        req.body.Question,
        req.body.Answer,
        req.body.Question2,
        req.body.Answer2,
        req.body.Email
    );

    var sTemplate2 = "insert into UserCategory (Username, Category) values";
    
    req.body.Category.forEach(
        (elem, idx) => {
            sTemplate2 += util.format("('%s', '%s')", req.body.Username, elem)
            if (idx !== req.body.Category.length-1) sTemplate2 += ","
        }
    )

    var sQuery = "BEGIN TRANSACTION; " + sQuery1 + "; " + sTemplate2 + "; COMMIT";
    
    dbutils.execQuery(sQuery).then(
        oData => {
            if (oData.count === req.body.Category.length+1){
                res.json({
                    success: true,
                    message: util.format("User %s was created successfully", req.body.Username),
                    message2: req.body.Category.length + " categories were added to the user."
                });    
            } else {
                res.status(400).send({success:false, message: "No row affected."});
            }
        }
    )
    .catch(
        err => {
            res.status(400).send({success: false});
        }
    );
});

function isInputValid(req, res){
    return true;
}


router.post('/login', function (req, res) {

    if (!req.body.Username || !req.body.Password){
        res.send({ message: "bad values" })

    } else {

        var ans = dbutils.execQuery("SELECT * FROM [User] WHERE Username='" + req.body.Username + "' AND Password='" + req.body.Password + "'");
        ans
        .then( oData => {
            if (oData.result.length) {
                sendToken(oData.result[0], res);
            } else { //0 row match
                res.json({success: false, message: "Username and/or password incorrect."})
            }
        })
        .catch( err => { //db connection error
            res.json({success: false, message: "Error connecting to the database."});
        })
        
    }   
});

function sendToken(user, res) {
    var payload = {
        Username: user.Username,
        // admin: user.isAdmin
    }

    var token = jwt.sign(payload, superSecret, {
        expiresIn: "1d" // expires in 24 hours
    });

    // return the information including token as JSON
    res.json({
        success: true,
        message: 'Enjoy your token!',
        token: token
    });

}

router.post('/getPWRestoreQuestion', function(req, res){
    if (!req.body.Username) {
        res.status(400).send({message: "You must enter a username"});
    } else {
        var sTemplate   = "SELECT Question, Question2 FROM [User] WHERE Username='%s'";
        var sQuery      = util.format(sTemplate, req.body.Username);

        var ans = dbutils.execQuery(sQuery);
        ans.then(
            oData => {
                if (oData.count){
                    res.json(oData.result[0]);
                } else {
                    res.status(400).send({success: false, message: "Couldn't find username " + req.body.Username});
                }
            }
        ).catch(
            err => {
                res.status(400).send(err);
            }
        )
    }
});

router.post('/getPassword', function(req, res){
    if (!req.body.Username || !req.body.Answer || !req.body.Answer2){
        res.status(400).send({success: false, message: "You must enter a username and an answer."});
    } else {
        var sTemplate   = "SELECT Answer, Answer2, Password FROM [User] WHERE Username='%s'";
        var sQuery      = util.format(sTemplate, req.body.Username);
        var ans         = dbutils.execQuery(sQuery);

        ans.then(
            oData => {
                if (oData.count){
                    if (oData.result[0].Answer === req.body.Answer && oData.result[0].Answer2 === req.body.Answer2){
                        res.json({Password: oData.result[0].Password});
                    } else {
                        res.status(400).send({success: false, message: "Wrong answer!"});
                    }
                } else {
                    res.status(400).send({success: false, message: "Couldn't find username " + req.body.Username});
                }
            }
        ).catch(
            err => {
                res.status(400).send(err);
            }
        )
    }
});

/*
 * For testing - user exists
*/
router.get('/:username', function(req,res){
    if (!req.params.username){
        res.status(400).send({success: false, message: "Invalid username. Cannot GET /Users/:username"});
    } else {
        var sTemplate = "SELECT * FROM [User] WHERE Username='%s'";
        var sQuery = util.format(sTemplate, req.params.username);
        var ans = dbutils.execQuery(sQuery);
        
        ans.then(
            oData => {
                if (oData.count) {
                    if (oData.result[0].Username === req.params.username){
                        res.json({success: true, message: util.format("User %s exists.", req.params.username)});
                    }
                }
            }
        ).catch(
            err => {
                res.status(400).send(err);
            }
        )
        
    }
});



module.exports = router;