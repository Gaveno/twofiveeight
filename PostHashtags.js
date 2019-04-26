var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// user schema
var PostHashtagsSchema = new Schema({
    post_id: { type: Schema.Types.ObjectId, ref: "PostSchema", required: true },
    hashtag_id: { type: Schema.Types.ObjectId, ref: "HashtagSchema", required: true }
});

PostHashtagsSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('PostHashtag', PostHashtagsSchema);