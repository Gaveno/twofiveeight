var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// user schema
var UserPostsSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "UserSchema", required: true },
    post_id: { type: Schema.Types.ObjectId, ref: "PostSchema", required: true },
    createdAt: { type: Date, expires: 604800, default: Date.now }
});

UserPostsSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('UserPost', UserPostsSchema);