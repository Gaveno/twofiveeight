var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// followers schema
var FollowersSchema = new Schema({
    followerCount: {type: number, required: false }
});

LikesSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Followers', FollowersSchema);