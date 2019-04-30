const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const cors = require('cors');
const authJwtController = require('./auth_jwt');
const User = require('./Users');
const jwt = require('jsonwebtoken');
const Post = require('./Posts');
const Comments = require('./Comments');
const fs = require('fs');
const multer  = require('multer');

const app = express();
module.exports = app; // for testing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(cors());

//Images:
/*const storage = multer.diskStorage({
    dest: function(req, res, cb) {
        cb(null, 'uploads/');
    }
});

const upload = multer({ storage: storage });*/
const upload = multer({dest: "uploads/"});

//var storage = multer.memoryStorage()
//var upload = multer({ storage: storage })

const router = express.Router();

router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    )
    .all(function (req, res) {
        console.log(req.body);
        res.status(403).send({ success: false, message: "Operation not supported. Only POST allowed." });
    });

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    })
    .all(function (req, res) {
        console.log(req.body);
        res.status(403).send({ success: false, message: "Operation not supported. Only GET allowed." });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    })
    .all(function (req, res) {
        console.log(req.body);
        res.status(403).send({ success: false, message: "Operation not supported. Only GET allowed." });
    });

router.route('/signup')
    .post(function(req, res) {
        if (!req.body.username || !req.body.password) {
            res.json({success: false, message: 'Please pass username and password.'});
        }
        else {
            var user = new User();
            user.firstName = req.body.name;
            user.username = req.body.username;
            user.password = req.body.password;
            // save the user
            user.save(function(err) {
                if (err) {
                    // duplicate entry
                    if (err.code == 11000)
                        return res.json({ success: false, message: 'A user with that username already exists. '});
                    else
                        return res.send(err);
                }

                res.json({ success: true, message: 'User created!' });
            });
        }
    })
    .all(function (req, res) {
        console.log(req.body);
        res.status(403).send({ success: false, message: "Operation not supported. Only POST allowed." });
    });

router.route('/signin')
    .post(function(req, res) {
        var userNew = new User();
        userNew.name = req.body.name;
        userNew.username = req.body.username;
        userNew.password = req.body.password;

        User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
            if (err) res.send(err);
            if (user) {
                user.comparePassword(userNew.password, function (isMatch) {
                    if (isMatch) {
                        var userToken = {id: user._id, username: user.username};
                        var token = jwt.sign(userToken, process.env.SECRET_KEY);
                        res.json({success: true, token: 'JWT ' + token});
                    }
                    else {
                        res.status(401).send({success: false, message: 'Authentication failed.'});
                    }
                });
            }
            else {
                return res.status(403).send({ success: false, message: "User not found." });
            }
        });
    })
    .all(function (req, res) {
        console.log(req.body);
        res.status(403).send({ success: false, message: "Operation not supported. Only POST allowed." });
    });

router.route('/posts')
//POST (making a new post) //upload.single('multerUpload')
    .post(authJwtController.isAuthenticated, upload.single('file'), function (req, res)
    {
        // if format = wrong, else post.
        if (!req.body)
        {
            res.status(400).json({success: false, message: 'Incorrect post format'});
        }
        else if (res instanceof multer.MulterError)
        {
            res.status(500).json({success: false, message: 'Image upload error'});
        }
        else
        {
            jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, decoded)
            {
                if(err)
                {
                    return res.status(403).json(err);
                }
                else if (req.file === undefined)
                {
                    res.status(500).json({success: false, message: 'No image provided'});
                }
                else
                {
                    let post = new Post();
                    post.user_id = decoded.id; //Set author ID to user ID (This is NOT the username)
                    post.text = req.body.text;
                    post.img.data = fs.readFileSync(req.file.path);
                    //post.img.data = req.file;
                    post.img.contentType = 'image/jpeg';

                    post.save(function(err)
                    {
                        if(err)
                        {
                            return res.status(403).json(err);
                        }
                        else
                        {
                            fs.unlink(req.file.path, (err) => {
                                if (err) console.log("Failed to remove file.");
                                else console.log(req.file.path+" was deleted after upload.");
                            });
                            return res.status(200).send({success: true, message: "Post added"});
                        }
                    })
                }
            })
        }
    })
    .get(function(req,res) //get: global latest, feed latest, user latest, same but group of 10 from timestamp
    {
        // Specific post by ID
        if (req.body.postID && req.body.postID !== "0")
            {
                Post.findById(req.body.postID).exec(function (err, postRaw)
                {
                    if (err) res.send(err);
                    else if(Post)
                    {
                        User.findById(postRaw.user_id).exec(function (err, userFound)
                        {
                            const post = Object.assign(postRaw, {username:userFound.username});
                            return res.status(200).json({success: true, message: "Success: specific post found", post });
                        })
                    }
                    else
                    {
                        return res.status(404).json({success: false, message: "Error: no post found"});
                    }
                })
            }
        // Latest global post
        else if ( (!req.query) ||
            (req.body.postScope === undefined || req.body.postScope === "global") &&
            (req.body.userID === undefined || req.body.userID === 0) &&
            (req.body.postTime === undefined || req.body.postTime === "latest" || req.body.postTime === "0") &&
            (req.body.resultsNumber === undefined || req.body.resultsNumber === 1) )
            {
                Post.findOne().sort({createdAt: -1}).limit(1).exec(function (err, postRaw)
                {
                    if (err) res.send(err);
                    else if(postRaw)
                    {
                        User.findById(postRaw.user_id).exec(function (err, userFound)
                        {
                            const post = Object.assign(postRaw, {username:userFound.username});
                            return res.status(200).json({success: true, message: "Success: latest global post found", post });
                        })
                    }
                    else
                    {
                        return res.status(404).json({success: false, message: "Error: no post found"});
                    }
                })
            }
        // Latest post by a specific user by ID
        else if (
            (req.body.postScope === "user") && (req.body.userID) &&
            (req.body.postTime === undefined || req.body.postTime === "latest" || req.body.postTime === "0") &&
            (req.body.resultsNumber === undefined || req.body.resultsNumber === 1) )
            {
                Post.findOne({ user_id: req.body.userID }).sort({createdAt: -1}).limit(1).exec(function (err, postRaw)
                {
                    if (err) res.send(err);
                    else if(postRaw)
                    {
                        User.findById(postRaw.user_id).exec(function (err, userFound)
                        {
                            const post = Object.assign(postRaw, {username:userFound.username});
                            return res.status(200).json({success: true, message: "Success: latest post by user found", post });
                        })
                    }
                    else
                    {
                        return res.status(404).json({success: false, message: "Error: no post found"});
                    }
                })
            }
        // Latest post in logged in users feed
        else if (
            (req.query.postScope === "feed") && (req.query.userID) &&
            (req.query.postTime === undefined || req.query.postTime !== "latest") &&
            (req.query.resultsNumber === undefined || req.query.resultsNumber === 1) )
            {
                // Find all user ID's that a user follows
                return res.status(501).json({success: false, message: "Error: method not implemented"});
            }

        // Group of posts before specific timestamp in global feed
        else if (
            (req.body.postScope === undefined || req.body.postScope === "global") &&
            (req.body.userID === undefined || req.body.userID === 0) &&
            (req.body.postTime && req.body.postTime !== "latest" && req.body.postTime !== "0") &&
            (req.body.resultsNumber !== undefined ) )
            {
                return res.status(501).json({success: false, message: "Error: method not implemented"});
            }

        // Group of posts before specific timestamp from single user
        else if (
            (req.query.postScope === undefined || req.query.postScope === "user") &&
            (req.query.userID || req.query.userID !== "0") &&
            (req.query.postTime || req.query.postTime !== "latest" || req.query.postTime !== "0") &&
            (req.query.resultsNumber !== undefined ) )
            {
                return res.status(501).json({success: false, message: "Error: method not implemented"});
            }
        // Group of posts before specific timestamp from users a person is following
        else if (
            (req.query.postScope === undefined || req.query.postScope === "user") &&
            (req.query.userID || req.query.userID !== "0") &&
            (req.query.postTime || req.query.postTime !== "latest" || req.query.postTime !== "0") &&
            (req.query.resultsNumber !== undefined ) )
        {
            return res.status(501).json({success: false, message: "Error: method not implemented"});
        }
        else
        {
            return res.status(400).json({success: false, message: "Error: Invalid request"});
        }
    })
    .all(function (req, res)
    {
        console.log(req.body);
        res = res.status(405);
        res.send("HTTP method not implemented");
    });

//COMMENTS REQUESTS HERE
router.route('/comments')
    .post(authJwtController.isAuthenticated, function (req, res) //POST (making a comment)
    {

    });

//FOLLOWERS REQUESTS HERE
router.route('/followers')
    //GET (see your followers)
    //GET (see who you follow)
    //gets with different follows
    .get(function(req,res)
    {

    });

router.route('/')
    .all(function (req, res) {
        console.log(req.body);
        res.status(404).send({ success: false, message: "Invalid path."});
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
