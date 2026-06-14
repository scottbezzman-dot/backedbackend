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
router.post('/login_with_password', authController.loginWithPassword);
router.post('/forget_password', authController.forgetPassword);
router.post('/set_new_password', authController.setNewPassword);
router.post('/add_verification_users', upload.single('image'), authController.addVerificationUsers);
router.post('/add_transaction_card', upload.single('image'), authController.addTransactionCard);
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
    const [results] = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);

    let user;
    if (results.length > 0) {
      user = results[0];
    } else {
      const usernameBase = (name || email.split('@')[0] || 'user')
        .replace(/\s/g, '')
        .toLowerCase()
        .slice(0, 30);

      const insertSql = `
          INSERT INTO users (username, name, email, is_email_verified, is_phone_verified, isActive) 
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;

      const [insertResult] = await db.query(insertSql, [
        usernameBase,
        name,
        email,
        true,
        true,
        true,
      ]);

      user = {
        id: insertResult.insertId,
        username: usernameBase,
        name: name,
        email: email,
        is_email_verified: true,
        is_phone_verified: true,
        isActive: true,
      };
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

module.exports = router;