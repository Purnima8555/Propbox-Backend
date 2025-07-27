const mongoose = require('mongoose');

const credSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    otp: {
    type: String,
    },
    otpExpiresAt: {
    type: Date,
    },
});

const Credential = mongoose.model('creds', credSchema);

module.exports = Credential;
