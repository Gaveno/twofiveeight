var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// follow schema
var FollowSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "UserSchema", required: true}
    //need to reference followercount in Followers.js here
    //maybe a boolean check if that is already someone the user follows?
});

FollowSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Follow', FollowSchema);

//this is not the followers, this is basically the follow button
//this should increment the following list and add the new follower's username to the followers list
//also need to check if that user is already followed (can't double/triple/etc follow someone)