const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../../config/db');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Check if user already exists
        const [results] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);

        if (results.length > 0) {
          // ✅ Existing user
          return done(null, results[0]);
        }

        // 🚀 New user creation
        const newUser = {
          username: profile.displayName.replace(/\s/g, '').toLowerCase(),
          name: profile.displayName,
          email: email,
          is_email_verified: 1,
          is_phone_verified: 1,
          isActive: 1,
        };

        const insertSql = `
          INSERT INTO users (username, name, email, is_email_verified, is_phone_verified, isActive) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [insertResult] = await db.query(insertSql, [
          newUser.username,
          newUser.name,
          newUser.email,
          newUser.is_email_verified,
          newUser.is_phone_verified,
          newUser.isActive,
        ]);

        newUser.id = insertResult.insertId;

        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
