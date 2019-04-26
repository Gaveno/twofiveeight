var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// user schema
var PostSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "UserSchema", required: true },
    // photo: { type: PHOTO }
    text: { type: String }
});

PostSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Post', PostSchema);