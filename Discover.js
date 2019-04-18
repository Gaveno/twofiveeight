var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// discover schema
var DiscoverSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "UserSchema", required: true},
    post: {type: Schema.Types.ObjectId, ref: "PostsSchema", required: true}

    //didn't think discover should have comments or followers attached to it
    //we could copy insta all the way and just show images, and then show username on click
    //or we can just display the username under the picture in the feed itself
});

DiscoverSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Discover', DiscoverSchema);

//discover is all new people and their posts
//should we JUST put "strangers" that the user doesn't follow yet?
//or we could make it a mix of people they do follow and new people