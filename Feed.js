var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// feed schema
var FeedSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "UserSchema", required: true},
    post: {type: Schema.Types.ObjectId, ref: "PostsSchema", required: true}

    //didn't think discover should have comments or followers attached to it
    //we could copy insta all the way and just show images, and then show username on click
    //or we can just display the username under the picture in the feed itself
});

//
FeedSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Feed', FeedSchema);

//feed is only posts of people the user is following
//no "strangers" and their posts
//will need to somehow only allow the posts of the followed users to show up

//this gives a duplicate reference error, but just adding followers and referencing them is also not it
//post: {type: Schema.Types.ObjectId, ref: "PostsSchema", ref: "FollowersSchema", required: true}
//need to connect posts to followed people