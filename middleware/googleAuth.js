import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        if (!email) return done(new Error('Email not found in Google profile'), null);

        let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
        if (!user) {
            try {
                user = await User.create({
                    googleId: profile.id,
                    name: profile.displayName,
                    email,
                    avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
                });
            } catch (err) {
                // Nếu lỗi trùng email, lấy user cũ
                if (err.code === 11000) {
                    user = await User.findOne({ email });
                } else {
                    return done(err, null);
                }
            }
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
