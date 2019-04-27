var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// followers schema
var FollowersSchema = new Schema({
    followers: {type: Schema.Types.ObjectId, ref: "UserSchema", required: false},
    following: {type: Schema.Types.ObjectId, ref: "UserSchema", required: false},
    followerCount: {type: number, required: false }
});

//this needs some rework in terms of followers vs follow requests
//also need to check that we are not following a person more than one (allowing that creates issues)
//since this is just another db field, we are probably only storing the user's followers and who they follow

LikesSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Followers', FollowersSchema);