var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// user schema
var HashtagSchema = new Schema({
    text: { type: String, required: true } // Text that follows #
    // NO expiration at this point.
});

HashtagSchema.pre('save', function(next) {
    next();
});

// return the model
module.exports = mongoose.model('Hashtag', HashtagSchema);

// NOTE: Does this need to exist, and should it use ID's, or the text itself?