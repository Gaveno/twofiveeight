var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);


var UserSchema = new Schema({
    username: { type: String, required: true },
    about: { type: String },
    lastName: { type: String },
    firstName: { type: String },
    password: { type: String, required: true }, // Stored as a hashed copy
    imgProfile: { data: Buffer, contentType: String}, // profile photo
    officialVerification: { type: Boolean },
    isAdmin: { type: Boolean },
    disabled: { type: Boolean, required: false }
});

// hash the password before the user is saved
UserSchema.pre('save', function(next) {
    var user = this;

    // hash the password only if the password has been changed or user is new
    if (!user.isModified('password')) return next();

    // generate the hash
    bcrypt.hash(user.password, null, null, function(err, hash) {
        if (err) return next(err);

        // change the password to the hashed version
        user.password = hash;
        next();
    });
});

UserSchema.methods.comparePassword = function(password, callback) {
    var user = this;

    bcrypt.compare(password, user.password, function(err, isMatch) {
       callback(isMatch) ;
    });
};

// return the model
module.exports = mongoose.model('User', UserSchema);