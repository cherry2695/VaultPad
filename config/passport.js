const passport   = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  scope: ['profile', 'email'],
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = await User.create({
        googleId:    profile.id,
        email:       profile.emails?.[0]?.value || '',
        displayName: profile.displayName || '',
        firstName:   profile.name?.givenName || '',
        avatar:      profile.photos?.[0]?.value || '',
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Store only user._id in the session cookie
passport.serializeUser((user, done) => done(null, user._id.toString()));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
