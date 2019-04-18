var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// posts schema
var PostsSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "UserSchema", required: true},
    post: {type: image, required: true },
    comments: {type: Schema.Types.ObjectId, ref: "CommentsSchema", required: true}

    //image type will need rework for sure, this is a very rough draft!
});

PostsSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Posts', PostsSchema);