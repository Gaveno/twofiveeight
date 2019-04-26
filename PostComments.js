var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// user schema
var PostCommentsSchema = new Schema({
    post_id: { type: Schema.Types.ObjectId, ref: "PostSchema", required: true },
    comment_id: { type: Schema.Types.ObjectId, ref: "CommentSchema", required: true }
});

PostCommentsSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('PostComment', PostCommentsSchema);