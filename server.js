require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const cors = require('cors');
const authJwtController = require('./auth_jwt');
const User = require('./Users');
const jwt = require('jsonwebtoken');
const Post = require('./Posts');
const Comments = require('./Comments');
const Hashtag = require('./Hashtags');
const PostHashtag = require('./PostHashtags');
const UserFollows = require('./UserFollows');
//const PostComments = require('./PostComments');
const fs = require('fs');
const multer  = require('multer');
mongoose = require('mongoose');

const app = express();
module.exports = app; // for testing
app.use(bodyParser({limit: '5mb'}));
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

/********************************************************************/
/******* TOP OF USERS ***********************************************/
/********************************************************************/
router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res)
    {
        // TODO: DISABLE!
        /*if (req.body.testingParamOn)
        {
            User.find(function (err, users) {
                if (err) res.send(err);
                // return the users
                res.json(users);
            })
        }
        else*/ if (req.body.infoByID && (req.body.includeProfilePhoto === "true" || req.body.includeProfilePhoto === undefined) )
        {
            User.findOne({_id: req.body.infoByID}, { password: 0}).exec(function (err, userFound)
            {
               if (err) res.send(err);
               else
               {
                   const userInfo = Object.assign(userFound);
                   return res.status(200).json({success: true, message: "Success: specific user found", userInfo });
               }

            })
        }

        else if (req.body.infoByID && (req.body.includeProfilePhoto === "false" ) )
        {
            User.findOne({_id: req.body.infoByID}, { password: 0, imgProfile: 0}).exec(function (err, userFound)
            {
                if (err) res.send(err);
                else
                {
                    const userInfo = Object.assign(userFound);
                    return res.status(200).json({success: true, message: "Success: specific user found", userInfo });
                }

            })
        }
        else
        {
            return res.status(400).json({success: false, message: "Error: Invalid request"});
        }
    });

router.route("/users/photo")
    .put(authJwtController.isAuthenticated, upload.single('file'), function (req, res)
    {
        if (res instanceof multer.MulterError)
            res.status(500).json({success: false, message: 'Image upload error'});
        if (req.file === undefined)
            return res.status(500).json({success: false, message: 'No image provided'});
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, decoded)
        {
            if(err) return res.status(403).json(err);
            let photoData = fs.readFileSync(req.file.path);
            console.log("Photo data: ", photoData);
            User.findByIdAndUpdate(decoded.id,
                {$set: {'imgProfile.contentType': 'image/jpeg', 'imgProfile.data': photoData }}
                , function(err, doc)
            {
                if (err) return res.send(err);
                console.log(doc);
                fs.unlink(req.file.path, (err) => {
                    if (err) console.log("Failed to remove file.");
                    else console.log(req.file.path+" was deleted after upload.");
                });
                return res.status(200).json({success: true, message: "Success: profile photo updated"});
            });

            /*User.findByIdAndUpdate(decoded.id, {$set: {'imgProfile.contentType': 'image/jpeg'}},
                function(err, doc) {if (err) res.send(err); else console.log(doc);});*/
        });
    });

router.route('/users/about')
    .put(authJwtController.isAuthenticated, function (req, res) {
        let text = "";
        if (req.body && req.body.text) text = req.body.text;
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, decoded)
        {
            if(err) return res.status(403).json(err);
            User.findByIdAndUpdate(decoded.id, {about: text}, {useFindAndModify: false}, function(err)
            {
                if (err) return res.send(err);
                return res.status(200).json({success: true, message: "Success: about updated"});
            });
        });
    })
    .all(function (req, res) {
        console.log(req.body);
        res.status(403).send({ success: false, message: "Operation not supported. Only PUT allowed. ABOUT" });
    });

router.route('/users/:username')
    .get(authJwtController.isAuthenticated, function (req, res) {
        if (!req.params.username) return res.status(403).json({success: false, message: "Error: missing username."});
        User.find({ username: { $regex: req.params.username, $options: "i"}})
            .select('username imgProfile officialVerification')
            .exec((err, users) => {
                if (err) return res.send(err);
                return res.status(200).json({ success: true, users: users });
            })
    })
    .all(function (req, res) {
        console.log(req.body);
        res.status(403).send({ success: false, message: "Operation not supported. Only GET allowed." });
    });

/********************************************************************/
/******* TOP OF AUTHENTICATION **************************************/
/********************************************************************/
router.route('/signup')
    .post(function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "http://2fiveeight.com");
        //res.status(200).json({success: false, message: "Signup has been disabled"});
        if (!req.body.username || !req.body.password) {
            res.json({success: false, message: 'Please pass username and password.'});
        }
        else {
            if (req.body.username.length > 10) return res.status(403).json({success: false, message: "Username too long."});
            if (req.body.password.length < 8) return res.status(403).json({success: false, message: "Password too short."});
            if (req.body.password.length > 20) return res.status(403).json({success: false, message: "Password too long."});
            var user = new User();
            user.firstName = req.body.name;
            user.username = req.body.username.toLowerCase();
            user.password = req.body.password;
            user.lastName = null;
            user.imgProfile = null;
            user.imgProfile.data = null;
            user.imgProfile.contentType = null;
            user.about = null;
            user.officialVerification = false;
            user.isAdmin = false;
            user.disabled = false;
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
        res.setHeader("Access-Control-Allow-Origin", "http://2fiveeight.com");
        if (!req.body) return res.status(403).json({success: false, message: "Error: missing request body."});
        if (!req.body.username || req.body.username.length <= 0)
            return res.status(403).json({success: false, message: "Must provide username."});
        if (!req.body.password || req.body.password.length <= 0)
            return res.status(403).json({success: false, message: "Must provide password."});

        User.findOne({ username: req.body.username.toLowerCase() }).select('name username password disabled isAdmin').exec(function(err, user) {
            if (err) res.send(err);
            if (user) {
                user.comparePassword(req.body.password, function (isMatch) {
                    if (isMatch) {
                        console.log("user: ", user);
                        if (!user.disabled) {
                            var userToken = {id: user._id, username: user.username};
                            var token = jwt.sign(userToken, process.env.SECRET_KEY);
                            res.json({success: true, token: 'JWT ' + token, isAdmin: user.isAdmin});
                        }
                        else {
                            res.status(200).json({success: false, message: "Awaiting verification from moderators."});
                        }
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

/********************************************************************/
/******* TOP OF POSTS ***********************************************/
/********************************************************************/
router.route('/posts/global')
    .get(authJwtController.isAuthenticated, function (req, res)
    {
        res.setHeader("Access-Control-Allow-Origin", "http://2fiveeight.com");
        let numResults = 10;
        let skip = 0;
        if (req.query.skip && req.query.skip > 0)
            skip = parseInt(req.query.skip);
        //console.log("skip: ", skip);
        Post.aggregate()
            .sort({createdAt: -1})
            .skip(skip)
            .limit(numResults)
            .lookup({from: 'users', localField: 'user_id', foreignField: '_id', as: 'user'})
            .lookup({from: 'comments', localField: '_id', foreignField: 'post_id', as: 'comments'})
            .exec(function (err, postsRaw) {
                //console.log("postsRaw: ", postsRaw);
                if (err) res.send(err);
                else if (postsRaw) {
                    // Extract only needed user info
                    for (let i = 0; i < postsRaw.length; i++) {
                        let usr;
                        if (postsRaw[i].user[0])
                            usr = Object.assign({}, postsRaw[i].user[0]);
                        else {
                            usr = Object.assign({}, {
                                username: "usernotfound",
                                imgProfile: null,
                                officialVerification: false
                            });
                        }
                        let newPost = Object.assign({}, {
                            _id: postsRaw[i]._id,
                            username: usr.username,
                            profPhoto: usr.imgProfile,
                            verified: usr.officialVerification,
                            createdAt: postsRaw[i].createdAt,
                            commentCount: postsRaw[i].comments.length, // TO-DO: add comment count to the aggregate
                            text: postsRaw[i].text,
                            img: postsRaw[i].img,
                        });
                        postsRaw[i] = Object.assign({}, newPost);
                    }
                    return res.status(200).json({success: true, feed: postsRaw});
                }
                else {
                    return res.status(404).json({success: false, message: "Error: no post found"});
                }
            });
    })
    .all(function(req, res) {
        return res.status(403).json("Error: Invalid operation on path.");
    });

router.route('/posts/home')
    .get(authJwtController.isAuthenticated, function (req, res)
    {
        let numResults = 10;
        let skip = 0;
        if (req.query.skip && req.query.skip > 0)
            skip = parseInt(req.query.skip);

        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
            //console.log("Get home feed for user: " + dec.username + " id: " + dec.id);
            if (err) return res.send(err);
            if (!dec) return res.status(403).json({success: false, message: "Error: unable to decode token."});
            UserFollows.find({user_id: dec.id}, function(err, links) {
                if (err) return res.send(err);
                let userids = [mongoose.Types.ObjectId(dec.id)];
                //console.log("userids: ", userids);
                for (let i = 0; i < links.length; i++) {
                    //console.log("user: ", links[i]);
                    userids.push(links[i].follows_id);
                }
                //console.log("User id list: ", userids);
                Post.aggregate()
                    .match({user_id: {$in: userids}})
                    .sort({createdAt: -1})
                    .skip(skip)
                    .limit(numResults)
                    .lookup({from: 'users', localField: 'user_id', foreignField: '_id', as: 'user'})
                    .lookup({from: 'comments', localField: '_id', foreignField: 'post_id', as: 'comments'})
                    .exec(function (err, postsRaw) {
                        //console.log("postsRaw: ", postsRaw);
                        if (err) res.send(err);
                        else if (postsRaw) {
                            // Extract only needed user info
                            for (let i = 0; i < postsRaw.length; i++) {
                                let usr;
                                if (postsRaw[i].user[0])
                                    usr = Object.assign({}, postsRaw[i].user[0]);
                                else {
                                    usr = Object.assign({}, {
                                        username: "usernotfound",
                                        imgProfile: null,
                                        officialVerification: false
                                    });
                                }
                                let newPost = Object.assign({}, {
                                    _id: postsRaw[i]._id,
                                    username: usr.username,
                                    profPhoto: usr.imgProfile,
                                    verified: usr.officialVerification,
                                    createdAt: postsRaw[i].createdAt,
                                    commentCount: postsRaw[i].comments.length, // TO-DO: add comment count to the aggregate
                                    text: postsRaw[i].text,
                                    img: postsRaw[i].img,
                                });
                                postsRaw[i] = Object.assign({}, newPost);
                            }
                            return res.status(200).json({success: true, feed: postsRaw});
                        } else {
                            return res.status(404).json({success: false, message: "Error: no post found"});
                        }
                    });
            });
        })
    })
    .all(function(req, res) {
        return res.status(403).json("Error: Invalid operation on path.");
    });

router.route('/posts/user/:username')
    .get(authJwtController.isAuthenticated, function (req, res)
    {
        //console.log("Getting posts from user: ", req.params.username);
        let numResults = 10;
        let skip = 0;
        if (!req.params.username) return res.status(403).json({success: false, messsage: "Error: user not specified."});
        if (req.query.skip && req.query.skip > 0)
            skip = parseInt(req.query.skip);
        //console.log("skip: ", skip);
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
            if (err) return res.send(err);
            if (!dec) return res.status(403).json({success: false, message: "Error: could not decode token."});
            User.findOne({"username": req.params.username.toLowerCase()}, '-password', function (err, user) {
                if (err) return res.send(err);
                if (!user) return res.status(403).json({success: false, message: "Error: user does not exist."});
                //console.log("user: ", user);
                Post.aggregate()
                    .match({"user_id": user._id})
                    .sort({createdAt: -1})
                    .skip(skip)
                    .limit(numResults)
                    .lookup({from: 'comments', localField: '_id', foreignField: 'post_id', as: 'comments'})
                    .exec(function (err, postsRaw) {
                        //console.log("postsRaw: ", postsRaw);
                        if (err) return res.send(err);
                        UserFollows.findOne({user_id: dec.id, follows_id: user._id}, (err, link) => {
                            // get number of followers
                            UserFollows.countDocuments({follows_id: user._id}, (err, followersCount) => {
                                if (err) return res.send(err);
                                // get number of followers
                                UserFollows.countDocuments({user_id: user._id}, (err, followingCount) => {
                                    if (err) return res.send(err);
                                    let following = false;
                                    if (!err && link) following = true;
                                    //console.log("following: ", following);
                                    // Extract only needed user info
                                    if (postsRaw) {
                                        for (let i = 0; i < postsRaw.length; i++) {
                                            let newPost = Object.assign({}, {
                                                _id: postsRaw[i]._id,
                                                username: user.username,
                                                profPhoto: user.imgProfile,
                                                verified: user.officialVerification,
                                                createdAt: postsRaw[i].createdAt,
                                                commentCount: postsRaw[i].comments.length, // TO-DO: add comment count to the aggregate
                                                text: postsRaw[i].text,
                                                img: postsRaw[i].img
                                            });
                                            postsRaw[i] = Object.assign({}, newPost);
                                        }
                                    }
                                    let newUser = Object.assign(
                                        {}, user._doc, {
                                                following: following,
                                                followersCount: followersCount,
                                                followingCount: followingCount
                                            }
                                        );
                                    return res.status(200).json({success: true, user: newUser, feed: postsRaw});
                                });
                            });
                        });
                    });
            });
        });
    });

router.route('/posts/hashtag/:hashtag')
    .get(authJwtController.isAuthenticated, function (req, res)
    {
        //console.log("Getting posts from user: ", req.params.username);
        let numResults = 10;
        let skip = 0;
        if (!req.params.hashtag) return res.status(403).json({success: false, messsage: "Error: hashtag not specified."});
        if (req.query.skip && req.query.skip > 0)
            skip = parseInt(req.query.skip);
        //console.log("Finding posts with hashtag: #", req.params.hashtag);
        Hashtag.aggregate()
            .match({ "text": "#"+req.params.hashtag })
            .lookup({ from: 'posthashtags', localField: '_id', foreignField: 'hashtag_id', as: 'posthashtags'})
            .exec(function(err, results) {
                //console.log("result: ", results);
                //console.log("posthashtags: ", results[0].posthashtags);
                if (err) return res.send(err);
                let postids = [];
                results.forEach((result) => {
                    result.posthashtags.forEach((posthashtag) => {
                        postids.push(posthashtag.post_id);
                    });
                });
                Post.aggregate()
                    .match({"_id": {$in: postids}})
                    .sort({createdAt: -1})
                    .skip(skip)
                    .limit(numResults)
                    .lookup({from: 'users', localField: 'user_id', foreignField: '_id', as: 'user'})
                    .lookup({from: 'comments', localField: '_id', foreignField: 'post_id', as: 'comments'})
                    .exec(function (err, postsRaw) {
                        if (err) res.send(err);
                        else if (postsRaw && postsRaw.length > 0) {
                            // Extract only needed user info
                            for (let i = 0; i < postsRaw.length; i++) {
                                let usr;
                                if (postsRaw[i].user[0])
                                    usr = Object.assign({}, postsRaw[i].user[0]);
                                else {
                                    usr = Object.assign({}, {
                                        username: "usernotfound",
                                        imgProfile: null,
                                        officialVerification: false
                                    });
                                }
                                let newPost = Object.assign({}, {
                                    _id: postsRaw[i]._id,
                                    username: usr.username,
                                    profPhoto: usr.imgProfile,
                                    verified: usr.officialVerification,
                                    createdAt: postsRaw[i].createdAt,
                                    commentCount: postsRaw[i].comments.length, // TO-DO: add comment count to the aggregate
                                    text: postsRaw[i].text,
                                    img: postsRaw[i].img,
                                });
                                postsRaw[i] = Object.assign({}, newPost);
                            }
                            return res.status(200).json({success: true, feed: postsRaw});
                        }
                        else {
                            return res.status(404).json({success: false, message: "Error: no post found"});
                        }
                    });
            });
    })
    .all(function(req, res) {
        return res.status(403).json("Error: Invalid operation on path.");
    });

router.route('/posts')
//POST (making a new post) //upload.single('multerUpload')
    .post(authJwtController.isAuthenticated, upload.single('file'), function (req, res) {
    // if format = wrong, else post.
        if (!req.body)
            return res.status(400).json({success: false, message: 'Incorrect post format'});
        if (res instanceof multer.MulterError)
            return res.status(500).json({success: false, message: 'Image upload error'});
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, decoded) {
            if(err) return res.status(403).json(err);
            User.findById(decoded.id, function(err, user) {
                if (err) return res.send(err);
                if (user.disabled) return res.status(401).json({success: false, message: "Error: user is disabled."});
                if (req.file === undefined)
                    return res.status(500).json({success: false, message: 'No image provided'});
                let post = new Post();
                post.user_id = decoded.id; //Set author ID to user ID (This is NOT the username)
                post.text = req.body.text;
                post.img.data = fs.readFileSync(req.file.path);
                //post.img.data = req.file;
                post.img.contentType = 'image/jpeg';

                post.save(function (err, post) {
                    if (err) {
                        return res.status(403).json(err);
                    } else {
                        // Parse hashtags
                        let parsed = req.body.text.split(" ");
                        let numFound = 0;
                        for (let i = 0; i < parsed.length && numFound < 5; i++) {
                            if (parsed[i][0] === "#" && parsed[i].length > 1) {
                                console.log("Hashtag found: ", parsed[i]);
                                numFound += 1;
                                parsed[i] = parsed[i].toLowerCase();
                                Hashtag.findOne({text: parsed[i]}, function (err, doc) {
                                    //console.log("After find: ", doc);
                                    if (err) return res.send(err);
                                    if (doc) {
                                        // If hashtag exists add link to existing hashtag
                                        //console.log("Created link to existing hashtag: ", doc);
                                        let newPostHashtag = new PostHashtag();
                                        newPostHashtag.post_id = post._id;
                                        newPostHashtag.hashtag_id = doc._id;
                                        newPostHashtag.save((err) => console.log(err));
                                    } else {
                                        // If hashtag doesn't exist create it, then add link
                                        //console.log("Hashtag does not exist: ", parsed[0]);
                                        let newHashtag = new Hashtag();
                                        newHashtag.text = parsed[i];
                                        newHashtag.save((err, newtag) => {
                                            if (err) return res.send(err);
                                            if (newtag) {
                                                //console.log("Created link to new hashtag: ", newtag);
                                                let newPostHashtag = new PostHashtag();
                                                newPostHashtag.post_id = post._id;
                                                newPostHashtag.hashtag_id = newtag._id;
                                                newPostHashtag.save((err) => console.log(err));
                                            }
                                        });
                                    }
                                })
                            }
                        }
                        fs.unlink(req.file.path, (err) => {
                            if (err) console.log("Failed to remove file.");
                            else console.log(req.file.path + " was deleted after upload.");
                        });
                        return res.status(200).send({success: true, message: "Post added"});
                    }
                })
            });
        })
    })
    .all(function (req, res) {
        console.log(req.body);
        res = res.status(405);
        res.status(404).json({success: false, message: "HTTP method not implemented"});
    });

/********************************************************************/
/******* TOP OF COMMENTS ********************************************/
/********************************************************************/
router.route('/comments/:post_id')
    .get(authJwtController.isAuthenticated, function(req, res) {
        //console.log("Get comments on post: ", req.params.post_id);
        if (!req.query || !req.params.post_id)
            res.status(403).json({success: false, message: "Error: Incorrectly formatted body."});
        Post.aggregate()
            .match({_id: mongoose.Types.ObjectId(req.params.post_id)})
            .lookup({from: 'comments', localField: '_id', foreignField: 'post_id', as: 'comments'})
            .exec(function(err, post) {
                if (err) res.send(err);
                if (!post) res.status(404).json({success: false, message: "Error: Post does not exist."});
                //console.log("comments found: ", post[0].comments);
                //console.log("post: ", post[0]);

                res.status(200).json({success: true, comments: post[0].comments});
            });
    });

router.route('/comments')
    .post(authJwtController.isAuthenticated, function (req, res) {
        /*console.log("body: ", req.body);
        console.log("comment: ", req.body.comment);
        console.log("post_id: ", req.body.post_id);
        console.log("Conditions: " + (!req.body) +" "+ (!req.body.comment)+ " " + (!req.body.post_id));*/
        /*if (!req.body || !req.body.comment || req.body.post_id) {
            return res.status(403).json({success: false, message: "Error: Incorrectly formatted body."});
        }*/
        if (req.body.comment.length > 258)
            return res.status(403).json({success: false, message: "Error: Comment length too long."});
        if (req.body.comment.split('#').length-1 > 5)
            return res.status(403).json({success: false, message: "Error: Too many hashtags."});

        Post.findOne({_id: mongoose.Types.ObjectId(req.body.post_id)}, function (err, post) {
            if (err) return res.send(err);
            if (!post) return res.status(404).json({success: false, message: "Error: Post does not exist."});
            jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
                if (err) return res.send(err);
                User.findOne({_id: mongoose.Types.ObjectId(dec.id)}, function (err, user) {
                    if (err) return res.send(err);
                    if (!user) return res.status(404).json({success: false, message: "Error: User does not exist."});
                    if (user.disabled) return res.status(401).json({success: false, message: "Error: User is disabled."});
                    let newComment = new Comments();
                    newComment.text = req.body.comment;
                    newComment.user_id = user._id;
                    newComment.username = user.username;
                    newComment.post_id = post._id;
                    newComment.save(function (err, comment) {
                        //console.log("comment: ", comment);
                        if (err) return res.send(err);
                        if (!comment) return res.status(404).json({success: false, message: "Error: Comment did not create."});
                        if (err) return res.send(err);
                        //console.log("saved");
                        return res.status(200).json({success: true, message: "Comment posted"});
                    });
                });
            });
        });
    });

/********************************************************************/
/******* TOP OF FOLLOWERS/FOLLOWING *********************************/
/********************************************************************/
router.route('/follow/:username')
    .post(authJwtController.isAuthenticated, function (req, res) {
       if (!req.params.username) return res.status(403).json({success: false, message: "Error: missing username."});
       User.findOne({username: req.params.username}, (err, user) => {
           //console.log("user._id: ", user._id);
           if (err) return res.send(err);
           if (!user) return res.status(404).json({success: false, message: "Error: user not found."});
           jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
               //console.log("dec: ", dec);
               if (err) return res.send(err);
               if (!dec) return res.status(403).json({success: false, message: "Error: unable to decode token."});
               if (user.username === dec.username) return res.status(403).json({success: false, message: "Error: cannot follow self."});
               UserFollows.findOne({user_id: dec.id, follows_id: user._id}, (err, link) => {
                   if (err) return res.send(err);
                   if (link) return res.status(403).json({
                       success: false, message: "Error: user is already following this user"
                   });
                   // Ready to create link.
                   //console.log("dec.user_id: ", dec.id);
                   //console.log("user._id: ", user._id);
                   let userFollows = new UserFollows();
                   userFollows.user_id = dec.id;
                   userFollows.follows_id = user._id;
                   userFollows.save((err) => {
                       if (err) return res.send(err);
                       else {
                           return res.status(200).json({
                               success: true, message: dec.username + " successfully followed " + user.username
                           });
                       }
                   })
               });
           });
       });
    })
    .delete(authJwtController.isAuthenticated, function (req, res) {
        if (!req.params.username) return res.status(403).json({success: false, message: "Error: missing username."});
        User.findOne({username: req.params.username}, (err, user) => {
            if (err) return res.send(err);
            if (!user) return res.status(404).json({success: false, message: "Error: user not found."});
            jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
                if (err) return res.send(err);
                if (!dec) return res.status(403).json({success: false, message: "Error: unable to decode token."});
                UserFollows.deleteOne({user_id: dec.id, follows_id: user._id}, (err) => {
                    if (err) return res.send(err);
                    return res.status(200).json({
                        success: true,
                        message: dec.username + " stopped following " + user.username
                    });
                });
            });
        });
    });

router.route('/follows/:username')
    .get(authJwtController.isAuthenticated, function (req, res) {
        if (!req.params || !req.params.username)
            return res.status(403).json({success: false, message: "Error: must provide username."});
        //jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
        User.findOne({username: req.params.username.toLowerCase()}, function (err, user) {
            if (err) return res.send(err);
            if (!user) return res.status(403).json({success: false, message: "Error: unable to find user."});
            UserFollows.find({user_id: user._id}, (err, links) => {
                //console.log("links: ", links);
                if (err) return res.send(err);
                if  (!links || links.length <= 0)
                    return res.status(404).json({success: false, message: "Error: did not find follows list(1)"});
                let linksReduced = [];
                for (let i = 0; i < links.length; i++) {
                    linksReduced.push(links[i].follows_id);
                }
                //console.log("links reducded: ", linksReduced);
                User.find({_id: {$in: linksReduced}})
                    .select('username imgProfile officialVerification')
                    .exec((err, users) => {
                        console.log("users: ", users);
                        if (err) return res.send(err);
                        if (!users || users.length <= 0)
                            return res.status(404).json({success: false, message: "Error: did not find follows list(2)"});
                        return res.status(200).json({success: true, users: users});
                })
            });
        });
    });

// get users that follow the logged in user
router.route('/followers/:username')
    .get(authJwtController.isAuthenticated, function (req, res) {
        if (!req.params || !req.params.username)
            return res.status(403).json({success: false, message: "Error: must provide username."});
        //jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
        User.findOne({username: req.params.username.toLowerCase()}, function (err, user) {
            if (err) return res.send(err);
            if (!user) return res.status(403).json({success: false, message: "Error: unable to find user."});
            UserFollows.find({follows_id: user._id}, (err, links) => {
                //console.log("links: ", links);
                if (err) return res.send(err);
                if  (!links || links.length <= 0)
                    return res.status(404).json({success: false, message: "Error: did not find follows list(1)"});
                let linksReduced = [];
                for (let i = 0; i < links.length; i++) {
                    linksReduced.push(links[i].user_id);
                }
                User.find({_id: {$in: linksReduced}})
                    .select('username imgProfile officialVerification')
                    .exec((err, users) => {
                        if (err) return res.send(err);
                        if (!users || users.length <= 0)
                            return res.status(404).json({success: false, message: "Error: did not find follows list(2)"});
                        return res.status(200).json({success: true, users: users});
                    })
            });
        });
    });

// Admin controls
router.route('/deletepostwithoutowner')
    .delete(authJwtController.isAuthenticated, function (req, res) {
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
            User.findOne({username: dec.username}, function (err, user) {
                if (!user.isAdmin) return res.status(401).json({success: false, message: "Admin control only."});
                // TO-DO: maybe implement this... Maybe not
            });
        });
    });

router.route('/admin/post/:postid')
    .delete(authJwtController.isAuthenticated, function (req, res) {
        if (!req.params || !req.params.postid) res.status(403).json({success: false, message: "Error: missing params."});
        // Get current user
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
            // Find current user in DB
            User.findOne({username: dec.username}, function (err, user) {
                // Verify user is an admin
                if (!user.isAdmin) return res.status(401).json({success: false, message: "Admin control only."});
                Post.findByIdAndDelete(req.params.postid, function(err, post) {
                    if (err) return res.send(err);
                    if (!post) return res.status(404).json({success: false, message: "Error: post not found."});
                    return res.status(200).json({success: true, message: "Successfully deleted post."});
                });
            });
        });
    });

router.route('/admin/comment/:commentid')
    .delete(authJwtController.isAuthenticated, function (req, res) {
        if (!req.params || !req.params.commentid) res.status(403).json({success: false, message: "Error: missing params."});
        // Get current user
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
            // Find current user in DB
            User.findOne({username: dec.username}, function (err, user) {
                // Verify user is an admin
                if (!user.isAdmin) return res.status(401).json({success: false, message: "Admin control only."});
                Comments.findByIdAndDelete(req.params.commentid, function(err, comment) {
                    if (err) return res.send(err);
                    if (!comment) return res.status(404).json({success: false, message: "Error: comment not found."});
                    return res.status(200).json({success: true, message: "Successfully deleted comment."});
                });
            });
        });
    });

router.route('/admin/user/:userid')
    .delete(authJwtController.isAuthenticated, function (req, res) {
        if (!req.params || !req.params.userid) res.status(403).json({success: false, message: "Error: missing params."});
        // Get current user
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
            // Find current user in DB
            User.findOne({username: dec.username}, function (err, user) {
                // Verify user is an admin
                if (!user.isAdmin) return res.status(401).json({success: false, message: "Admin control only."});
                // Ban user (disable account)
                User.findByIdAndUpdate(req.params.userid, {disabled: true}, function(err, buser) {
                    if (err) return res.send(err);
                    if (!buser) return res.status(404).json({success: false, message: "Error: user not found."});
                    return res.status(200).json({success: true, message: "Successfully banned user."});
                });
            });
        });
    });

router.route('/')
    .all(function (req, res) {
        console.log(req.body);
        res.status(404).send({ success: false, message: "Invalid path."});
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
