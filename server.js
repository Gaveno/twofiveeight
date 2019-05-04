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

/********************************************************************/
/******* TOP OF AUTHENTICATION **************************************/
/********************************************************************/
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
            user.lastName = null;
            user.imgProfile = null;
            user.imgProfile.data = null;
            user.imgProfile.contentType = null;
            user.about = null;
            user.officialVerification = false;
            user.isAdmin = false;
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
        /*var userNew = new User();
        userNew.name = req.body.name;
        userNew.username = req.body.username;
        userNew.password = req.body.password;*/

        User.findOne({ username: req.body.username }).select('name username password').exec(function(err, user) {
            if (err) res.send(err);
            if (user) {
                user.comparePassword(req.body.password, function (isMatch) {
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

/********************************************************************/
/******* TOP OF POSTS ***********************************************/
/********************************************************************/
router.route('/posts/global')
    .get(authJwtController.isAuthenticated, function (req, res)
    {
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
            .exec(function (err, postsRaw)
            {
                //console.log("postsRaw: ", postsRaw);
                if (err) res.send(err);
                else if (postsRaw && postsRaw.length > 0)
                {
                    // Extract only needed user info
                    for (let i = 0; i < postsRaw.length; i++)
                    {
                        let newPost = Object.assign({}, {
                            _id: postsRaw[i]._id,
                            username: postsRaw[i].user[0].username,
                            profPhoto: postsRaw[i].user[0].imgProfile,
                            verified: postsRaw[i].user[0].officialVerification,
                            createdAt: postsRaw[i].createdAt,
                            commentCount: postsRaw[i].comments.length, // TO-DO: add comment count to the aggregate
                            text: postsRaw[i].text,
                            img: postsRaw[i].img,
                        });
                        postsRaw[i] = Object.assign({}, newPost);
                    }
                    return res.status(200).json({success: true, feed: postsRaw});
                }
                else
                {
                    return res.status(404).json({success: false, message: "Error: no post found"});
                }
            });
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
            User.findOne({"username": req.params.username}, '-password', function (err, user) {
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
                        if (err) res.send(err);
                        else if (postsRaw && postsRaw.length > 0) {
                            UserFollows.findOne({user_id: dec.user_id, follows_id: user._id}, (err, link) => {
                                // Extract only needed user info
                                let following = false;
                                if (!err && link) following = true;
                                for (let i = 0; i < postsRaw.length; i++) {
                                    let newPost = Object.assign({}, {
                                        _id: postsRaw[i]._id,
                                        username: user.username,
                                        profPhoto: user.imgProfile,
                                        verified: user.officialVerification,
                                        createdAt: postsRaw[i].createdAt,
                                        commentCount: postsRaw[i].comments.length, // TO-DO: add comment count to the aggregate
                                        text: postsRaw[i].text,
                                        img: postsRaw[i].img,
                                        following: following
                                    });
                                    postsRaw[i] = Object.assign({}, newPost);
                                }
                                return res.status(200).json({success: true, user: user, feed: postsRaw});
                            });
                        } else {
                            return res.status(200).json({success: true, user: user, feed: []});
                        }
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
        //console.log("skip: ", skip);
        Hashtag.aggregate()
            .match({ "text": "#"+req.params.hashtag })
            .lookup({ from: 'posthashtags', localField: '_id', foreignField: 'hashtag_id', as: 'posthashtags'})
            .unwind('posthashtags')
            .lookup({ from: 'posts', localField: 'posthashtags', foreignField: '_id', as: "posts"})
            .exec(function(err, result) {
                console.log("result: ", result);
                if (err) return res.send(err);
                return res.status(200).json({success: true, message: "still in testing"});
                /*if (posthashtags && posthashtags.length > 0) {
                    Post.aggregate()
                        .match({"_id": hashtag._id})
                        .sort({createdAt: -1})
                        .skip(skip)
                        .limit(numResults)
                        .lookup({from: 'comments', localField: '_id', foreignField: 'post_id', as: 'comments'})
                        .exec(function (err, postsRaw) {
                        });
                }*/
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
            if (req.file === undefined)
                return res.status(500).json({success: false, message: 'No image provided'});
            let post = new Post();
            post.user_id = decoded.id; //Set author ID to user ID (This is NOT the username)
            post.text = req.body.text;
            post.img.data = fs.readFileSync(req.file.path);
            //post.img.data = req.file;
            post.img.contentType = 'image/jpeg';

            post.save(function(err, post) {
                if(err) {
                    return res.status(403).json(err);
                }
                else {
                    // Parse hashtags
                    let parsed = req.body.text.split(" ");
                    for (let i = 0; i < Math.min(parsed.length, 5); i++) {
                        if (parsed[i][0] === "#" && parsed[i].length > 1) {
                            //console.log("Hashtag found: ", parsed[i]);
                            Hashtag.findOne({text: parsed[i]}, function(err, doc) {
                                //console.log("After find: ", doc);
                                if (err) return res.send(err);
                                if (doc) {
                                    // If hashtag exists add link to existing hashtag
                                    //console.log("Created link to existing hashtag: ", doc);
                                    let newPostHashtag = new PostHashtag();
                                    newPostHashtag.post_id = post._id;
                                    newPostHashtag.hashtag_id = doc._id;
                                    newPostHashtag.save((err) => console.log(err));
                                }
                                else {
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
                        else console.log(req.file.path+" was deleted after upload.");
                    });
                    return res.status(200).send({success: true, message: "Post added"});
                }
            })
        })
    })
    .get(function(req,res) //get: global latest, feed latest, user latest, same but group of 10 from timestamp
    {
        console.log("get on posts");
        console.log("req: ",req);
        console.log("req.body: " + JSON.stringify(req.body));
        console.log("req.data: " + JSON.stringify(req.data));
        // Specific post by ID
        if (req.body.postID && req.body.postID !== "0")
            {
                console.log("entrance 1 "+JSON.stringify(req.body));
                Post.findById(req.body.postID).exec(function (err, postRaw)
                {
                    if (err)
                    {
                        return res.status(403).json(err);
                    }
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
        else if ( (!req.body) ||
            (!req.body.postScope || req.body.postScope === "global") &&
            (!req.body.userID || req.body.userID === 0) &&
            (!req.body.postTime || req.body.postTime === "latest" || req.body.postTime === "0") &&
            (!req.body.resultsNumber || req.body.resultsNumber === 1) )
            {
                console.log("entrance 2 "+JSON.stringify(req.body));
                Post.findOne().sort({createdAt: -1}).limit(1).exec(function (err, postRaw)
                {
                    if (err)
                    {
                        return res.status(403).json(err);
                    }
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
        // Global post one before specific timestamp
        else if ( (req.body.postScope === undefined || req.body.postScope === "global") &&
            (req.body.userID === undefined || req.body.userID === 0) &&
            (req.body.postTime /*&& req.body.postTime !== "latest" && req.body.postTime !== "0"*/) &&
            (req.body.resultsNumber === undefined || req.body.resultsNumber === 1) )
            {
                console.log("entrance 3 "+JSON.stringify(req.body));
                Post.findOne({"createdAt":{$lt:req.body.postTime}}).sort({createdAt: -1}).limit(1).exec(function (err, postRaw)
                {
                    if (err)
                    {
                        return res.status(403).json(err);
                    }
                    else if(postRaw)
                    {
                        User.findById(postRaw.user_id).exec(function (err, userFound)
                        {
                            if (err)
                            {
                                return res.status(403).json(err);
                            }
                            else if(userFound)
                            {
                                const post = Object.assign(postRaw, {username:userFound.username});
                                return res.status(200).json({success: true, message: "Success: single post before postTime found", post });
                            }
                            else
                            {
                                return res.status(404).json({success: false, message: "Error: no post found"});
                            }
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
                console.log("entrance 4 "+JSON.stringify(req.body));
                Post.findOne({ user_id: req.body.userID }).sort({createdAt: -1}).limit(1).exec(function (err, postRaw)
                {
                    if (err)
                    {
                        return res.status(403).json(err);
                    }
                    else if(postRaw)
                    {
                        User.findById(postRaw.user_id).exec(function (err, userFound)
                        {
                            if (err) res.send(err);
                            else
                            {
                                const post = Object.assign(postRaw, {username:userFound.username});
                                return res.status(200).json({success: true, message: "Success: latest post by user found", post });
                            }
                        })
                    }
                    else
                    {
                        return res.status(404).json({success: false, message: "Error: no post found"});
                    }
                })
            }
        // Userpost one before specific timestamp
        else if ( (req.body.postScope === "user") && (req.body.userID) &&
            (req.body.postTime /*&& req.body.postTime !== "latest" && req.body.postTime !== "0"*/) &&
            (req.body.resultsNumber === undefined || req.body.resultsNumber === 1) )
        {
            console.log("entrance 5 "+JSON.stringify(req.body));
            Post.findOne({ user_id: req.body.userID }).sort({createdAt: -1}).limit(1).exec(function (err, postRaw)
            {
                if (err)
                {
                    return res.status(403).json(err);
                }
                else if(postRaw)
                {
                    User.findById(postRaw.user_id).exec(function (err, userFound)
                    {
                        if (err) res.send(err);
                        else
                        {
                            const post = Object.assign(postRaw, {username:userFound.username});
                            return res.status(200).json({success: true, message: "Success: single post by user before postTime found", post });
                        }
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
                console.log("entrance 6 "+JSON.stringify(req.body));
                // Find all user ID's that a user follows
                return res.status(501).json({success: false, message: "Error: method not implemented"});
            }

        // Group of posts before specific timestamp in global feed
        else if (
            (req.body.postScope === undefined || req.body.postScope === "global") &&
            (req.body.userID === undefined || req.body.userID === 0) &&
            (req.body.postTime && req.body.postTime !== "latest" && req.body.postTime !== "0") &&
            (req.body.resultsNumber && req.body.resultsNumber > 1 ) )
            // TODO: NOT CORRECT YET
            {
                console.log("entrance 7 "+JSON.stringify(req.body));
                    //Post.findOne().sort({createdAt: -1}).limit(req.body.resultsNumber).exec(function (err, postRaw)
                Post.aggregate()
                    .sort({createdAt: -1})
                    .limit(req.body.resultsNumber)
                    .lookup({from: 'users', localField: 'user_id', foreignField: '_id', as: 'user'})
                    .exec(function (err, postsRaw) {
                        if (err) res.send(err);
                        else if (postsRaw && postsRaw.length > 0) {
                            // Extract only needed user info
                            postsRaw.forEach((post, i, postArray) => {
                                let newPost = Object.assign({}, {
                                    img: post.img,
                                    username: post.user.username,
                                    profPhoto: post.user.imgProfile,
                                    commentCount: 0, // TO-DO: add comment count to the aggregate
                                });
                                Object.assign(postArray[i], newPost);
                            });
                            console.log(JSON.stringify(postsRaw));
                            return res.status(200).json({success: true, feed: postsRaw});
                                    //const post = Object.assign(postRaw, {username:userFound.username});
                                    //return res.status(200).json({success: true, message: "Success: latest global post found UNFINISHED", post });
                        }
                        else {
                            return res.status(404).json({success: false, message: "Error: no post found"});
                        }
                    })
            }

        // Group of posts before specific timestamp from single user
        else if (
            (req.query.postScope === undefined || req.query.postScope === "user") &&
            (req.query.userID || req.query.userID !== "0") &&
            (req.query.postTime || req.query.postTime !== "latest" || req.query.postTime !== "0") &&
            (req.query.resultsNumber !== undefined ) ) {
                console.log("entrance 8 "+JSON.stringify(req.body));
                return res.status(501).json({success: false, message: "Error: method not implemented"});
            }
        // Group of posts before specific timestamp from users a person is following
        else if (
            (req.query.postScope === undefined || req.query.postScope === "user") &&
            (req.query.userID || req.query.userID !== "0") &&
            (req.query.postTime || req.query.postTime !== "latest" || req.query.postTime !== "0") &&
            (req.query.resultsNumber !== undefined ) ) {
            console.log("entrance 9 "+JSON.stringify(req.body));
            return res.status(501).json({success: false, message: "Error: method not implemented"});
        }
        else {
            console.log("entrance 10 "+JSON.stringify(req.body));
            return res.status(400).json({success: false, message: "Error: Invalid request"});
        }
    })
    .all(function (req, res) {
        console.log(req.body);
        res = res.status(405);
        res.send("HTTP method not implemented");
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
        console.log("body: ", req.body);
        console.log("comment: ", req.body.comment);
        console.log("post_id: ", req.body.post_id);
        console.log("Conditions: " + (!req.body) +" "+ (!req.body.comment)+ " " + (!req.body.post_id));
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

router.route('/follows')
    .get(authJwtController.isAuthenticated, function (req, res) {
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
            if (err) return res.send(err);
            if (!dec) return res.status(403).json({success: false, message: "Error: unable to decode token."});
            UserFollows.find({user_id: dec.id}, (err, links) => {
                console.log("links: ", links);
                if (err) return res.send(err);
                if  (!links || links.length <= 0)
                    return res.status(404).json({success: false, message: "Error: did not find follows list(1)"});
                let linksReduced = [];
                for (let i = 0; i < links.length; i++) {
                    linksReduced.push(links[i].follows_id);
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

// get users that follow the logged in user
router.route('/followers')
    .get(authJwtController.isAuthenticated, function (req, res) {
        jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, dec) {
            if (err) return res.send(err);
            if (!dec) return res.status(403).json({success: false, message: "Error: unable to decode token."});
            UserFollows.find({follows_id: dec.id}, (err, links) => {
                console.log("links: ", links);
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

router.route('/')
    .all(function (req, res) {
        console.log(req.body);
        res.status(404).send({ success: false, message: "Invalid path."});
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
