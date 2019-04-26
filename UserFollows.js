var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// user schema
var UserFollowsSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "UserSchema", required: true }, //ID- not username- of users
    post_id: { type: Schema.Types.ObjectId, ref: "PostSchema", required: true }
});

UserFollowsSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('UserFollows', UserFollowsSchema);