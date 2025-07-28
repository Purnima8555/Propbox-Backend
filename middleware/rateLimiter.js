const rateLimit = require("express-rate-limit");

exports.loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    message: "Too many login attempts from this IP, please try again after 10 minutes.",
    retryAfter: 2 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    message: "Too many OTP attempts, try again after 10 minutes.",
    retryAfter: 2 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    message: "Too many password reset attempts, try again after 15 minutes.",
    retryAfter: 2 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});