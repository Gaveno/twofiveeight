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

//POSTS REQUESTS HERE
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
        if(!req.body)
        {
            return res.status(403).json({success: false, message: "Empty get"});
        }
        else {
            if (req.query && (req.query.batch === undefined || req.query.batch === "false"))
            {
                Post.findOne().sort({createdAt: -1}).limit(1).exec(function (err, post)
                {
                    if (err) res.send(err);
                    else if(Post)
                    {
                        return res.status(200).json({success: true, message: "Success: latest post found", Post: post});
                    }
                    else
                    {
                        return res.status(404).json({success: false, message: "Error: no post found", Post: post});
                    }
                })
            }
            else {
                // IMPLEMENT - batch from certain time and parameters
            }
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
