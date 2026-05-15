const express = require('express');
const router = express.Router();
const authController = require('../../src/authApi/authController');
const jwt = require('jsonwebtoken');
const upload = require('../../src/uploadimage/upload');
const db = require('../../config/db');
const { initFirebaseAdmin } = require('./firebaseAdmin');

router.post('/register', authController.register);
router.post('/verify_email', authController.verifyEmail);
router.post('/set_new_passcode', authController.setNewPasscode);
router.post('/login_with_passcode', authController.loginWithPasscode);
router.post('/login_with_password', authController.loginWithPassword );
router.post('/forget_password', authController.forgetPassword);
router.post('/set_new_password', authController.setNewPassword);
router.post('/add_verification_users',upload.single('image'), authController.addVerificationUsers);
router.post('/add_transaction_card',upload.single('image'), authController.addTransactionCard);
router.get('/get_users', authController.getuser);
router.get('/get_verification_users', authController.getVerificationUsers);
router.get('/get_Transactions_users', authController.getTransactions);

// ------firebase auth (Google)
router.post('/firebase/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ msg: 'idToken is required', status_code: false });
    }

    const admin = initFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);

    const email = decoded.email;
    const name = decoded.name || decoded.email || '';

    if (!email) {
      return res.status(400).json({ msg: 'Firebase token missing email', status_code: false });
    }

    // Upsert user (match existing Google OAuth behavior: create by email if missing)
    const [results] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);

    let user;
    if (results.length > 0) {
      user = results[0];
    } else {
      const usernameBase = (name || email.split('@')[0] || 'user')
        .replace(/\s/g, '')
        .toLowerCase()
        .slice(0, 30);

      const newUser = {
        username: usernameBase,
        name: name,
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
      user = newUser;
    }

    // IMPORTANT: some endpoints read decoded.userId, others decoded.id
    const token = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        firebase_uid: decoded.uid,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      msg: 'Login successful',
      status_code: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('❌ Firebase login error:', err);
    return res.status(401).json({ msg: err.message || 'Firebase auth failed', status_code: false });
  }
});

// ------google auth (legacy Passport OAuth)
// Keep this optional so the server doesn't crash when GOOGLE_CLIENT_ID isn't set.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const passport = require('../../src/authApi/googleStrategy');

  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  // Google OAuth - Callback after Google login
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
      const user = req.user;

      const token = jwt.sign(
        {
          userId: user.id,
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.redirect(`${process.env.OWNER_URL}/success?token=${token}`);
    }
  );
} else {
  router.get('/google', (req, res) =>
    res.status(400).json({ msg: 'Google OAuth disabled on server', status_code: false })
  );
  router.get('/google/callback', (req, res) =>
    res.status(400).json({ msg: 'Google OAuth disabled on server', status_code: false })
  );
}

module.exports = router;
