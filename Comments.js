var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// comments schema
var CommentsSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "UserSchema", required: true},
    comment: {type: string, required: false }

    //not sure how to go on the required: parameter
    //if comment exists, then so should username of the person who made the comment
    //but users aren't required to post a comment, so that should be optional
});

CommentsSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Comments', CommentsSchema);