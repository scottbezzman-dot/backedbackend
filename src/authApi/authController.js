const dotenv = require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const { sendEmail } = require('../emailSend/Nodemailer');
const VerificationTemplete = require('../uploadimage/templates/VerificationTemplete');
const e = require('express');
const { baseUrl } = require('../cryptoApi/cryptoPriceService');
const transactionTemplate = require('../uploadimage/templates/transactionTemplate');

exports.register = async (req, res) => {
  try {
    const { username, name, email, password, phone, country_code } = req.body;

    // ✅ Basic validation
    if (!email) return res.status(201).json({ msg: 'Email is required.', status_code: false });
    if (!password) return res.status(201).json({ msg: 'Password is required', status_code: false });
    if (!name) return res.status(201).json({ msg: 'Name is required', status_code: false });
    if (!phone) return res.status(201).json({ msg: 'Phone number is required', status_code: false });
    if (!country_code) return res.status(201).json({ msg: 'Country code is required', status_code: false });
    if (!username) return res.status(201).json({ msg: 'Username is required', status_code: false });

    // 🔑 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔍 Check for duplicates
    const checkSql = `
      SELECT id, username, email, phone, country_code 
      FROM users 
      WHERE username = $1 OR email = $2 OR (phone = $3 AND country_code = $4)
    `;
    const [rows] = await db.query(checkSql, [username, email, phone, country_code]);

    if (rows.length > 0) {
      let duplicateField = '';
      if (rows.some(r => r.username === username)) duplicateField = 'username';
      else if (rows.some(r => r.email === email)) duplicateField = 'email';
      else if (rows.some(r => r.phone === phone && r.country_code === country_code)) {
        duplicateField = 'phone number with this country code';
      }

      return res.status(409).json({ // use 409 Conflict
        msg: `${duplicateField} already exists`,
        status_code: false
      });
    }

    // 🚀 Insert new user
    const insertSql = `
      INSERT INTO users (username, name, email, password, phone, country_code, is_email_verified, is_phone_verified, isActive, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, false, false, true, NOW(), NOW())
      RETURNING id
    `;
    const [result] = await db.query(insertSql, [
      username,
      name,
      email,
      hashedPassword,
      phone,
      country_code
    ]);

    const userId = result.insertId;

    // 🔑 Generate JWT
    const token = jwt.sign(
      { userId: userId, email, username, name, phone, country_code },
      process.env.JWT_SECRET
    );

    // 📧 Send verification email
    const verifylink = `https://api.backedweb3shield.vercel.app/verifyEmail?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Welcome to Our Platform!',
      html: `
        <h2>Verify Your Email</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${verifylink}" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px;">Verify Email</a>
      `
    });

    // ✅ Success response
    res.status(201).json({
      msg: 'User registered successfully',
      status_code: true,
      token,
      user: {
        id: userId,
        username,
        name,
        email,
        phone,
        country_code,
      },
    });

  } catch (err) {
    console.error("❌ Registration Error:", err);
    res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.getuser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.slice(7) : "";

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId;

    const sql = `SELECT * FROM users WHERE id = $1`;
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(201).json({ msg: 'User not found', status_code: false });
    }
    const user = rows[0]; 

    res.status(200).json({ user, status_code: true });
  } catch (err) {
    console.error("❌ getuser Error:", err.message);
    res.status(500).json({ msg: err.message, status_code: false });
  }
}

exports.verifyEmail = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ msg: 'Token is required', status_code: false });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("❌ JWT Error:", err.message);
      return res.status(401).json({ msg: 'Invalid or expired token', status_code: false });
    }

    const id = decoded.id;

    // Step 1: Check if user exists
    const [rows] = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (rows.length === 0) {
      return res.status(201).json({ msg: 'User not found', status_code: false });
    }

    const user = rows[0];

    // Step 2: Update verification flags
    const [updateResult] = await db.query(
      `UPDATE users SET is_email_verified = true, is_phone_verified = true, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(201).json({ msg: 'User not found or already verified', status_code: false });
    }

    // Step 3: Generate a fresh token with user data
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        phone: user.phone,
        country_code: user.country_code
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      msg: 'Email verified successfully',
      status_code: true,
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        country_code: user.country_code
      }
    });

  } catch (err) {
    console.error("❌ verifyEmail Error:", err.message);
    return res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.setNewPasscode = async (req, res) => {
  try {
    const { passcode } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.slice(7) : "";

    // Validate token and input
    if (!token) {
      return res.status(401).json({ msg: 'Token is required', status_code: false });
    }
    if (!passcode) {
      return res.status(201).json({ msg: 'Passcode is required', status_code: false });
    }
    if (!/^\d{6}$/.test(passcode)) {
      return res.status(201).json({ msg: 'Passcode must be 6 digits', status_code: false });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ msg: 'Invalid or expired token', status_code: false });
    }

    const id = decoded.id;

    // Step 1: Check if user exists
    const [rows] = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (rows.length === 0) {
      return res.status(201).json({ msg: 'User not found', status_code: false });
    }

    // Step 2: Hash the passcode
    const hashedPasscode = await bcrypt.hash(passcode, 10);

    // Step 3: Update passcode (only for active users)
    const [updateResult] = await db.query(
      `UPDATE users SET passcode = $1, updated_at = NOW() WHERE id = $2 AND isActive = true`,
      [hashedPasscode, id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(201).json({ msg: 'User not found or inactive', status_code: false });
    }

    res.status(200).json({ msg: 'Passcode set successfully', status_code: true });

  } catch (err) {
    console.error("❌ setNewPasscode Error:", err.message);
    res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.loginWithPasscode = async (req, res) => {
  try {
    const { email, passcode } = req.body;

    // Validate input
    if (!email || !passcode) {
      return res.status(201).json({ msg: 'Email and passcode are required', status_code: false });
    }

    // Step 1: Find active user by email
    const [rows] = await db.query(`SELECT * FROM users WHERE email = $1 AND isActive = true`, [email]);

    if (rows.length === 0) {
      return res.status(201).json({ msg: 'User not found or inactive', status_code: false });
    }

    const user = rows[0];

    // Step 2: Compare passcode
    const passcodeMatch = await bcrypt.compare(passcode, user.passcode);
    if (!passcodeMatch) {
      return res.status(401).json({ msg: 'Invalid passcode', status_code: false });
    }

    // Step 3: Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 4: Return response
    res.status(200).json({
      msg: 'Login successful',
      status_code: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        country_code: user.country_code,
        is_email_verified: user.is_email_verified,
        is_phone_verified: user.is_phone_verified
      },
    });

  } catch (err) {
    console.error("❌ loginWithPasscode Error:", err.message);
    res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(201).json({ msg: 'Email and password are required', status_code: false });
    }

    // Step 1: Find active user by email
    const [rows] = await db.query(`SELECT * FROM users WHERE email = $1 AND isActive = true`, [email]);

    if (rows.length === 0) {
      return res.status(201).json({ msg: 'User not found or inactive', status_code: false });
    }

    const user = rows[0];

    // Step 2: Compare password
    const passwordMatch = await bcrypt.compare(password, user.password || '');
    if (!passwordMatch) {
      return res.status(401).json({ msg: 'Invalid password', status_code: false });
    }

    // Step 3: Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET
    );

    // Step 4: Return user info
    res.status(200).json({
      msg: 'Login successful',
      status_code: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        country_code: user.country_code,
        is_email_verified: user.is_email_verified,
        is_phone_verified: user.is_phone_verified
      },
    });

  } catch (err) {
    console.error("❌ loginWithPassword Error:", err.message);
    res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(201).json({ msg: 'Email is required', status_code: false });
    }

    // Step 1: Check if user exists and is active
    const [rows] = await db.query(
      `SELECT * FROM users WHERE email = $1 AND isActive = true`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(201).json({ msg: 'No active user with this email', status_code: false });
    }

    const user = rows[0];

    // Step 2: Generate reset token (valid for 15 minutes)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Step 3: Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/change-password?token=${token}`;

    console.log("🔗 Reset Link:", resetLink);

    // Step 4: Send reset email
    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h3>Reset Your Password</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link is valid for 15 minutes.</p>
      `
    });

    return res.status(200).json({ msg: 'Email sent successfully', status_code: true });

  } catch (err) {
    console.error("❌ ForgetPassword Error:", err.message);
    return res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.setNewPassword = async (req, res) => {
  const { password } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.slice(7) : "";

  if (!password) {
    return res.status(201).json({ msg: 'Password is required', status_code: false });
  } else if (!token) {
    return res.status(201).json({ msg: 'Token is required', status_code: false });
  }

  try {
    // 1. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id; // ✅ Use "id" instead of "userId"

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Ensure user exists & update password
    const sql = `UPDATE users SET password = $1 WHERE id = $2 AND isActive = true`;

    const [result] = await db.query(sql, [hashedPassword, userId]);

    if (result.affectedRows === 0) {
      return res.status(201).json({ msg: 'User not found or inactive', status_code: false });
    }

    return res.json({ msg: 'Password reset successfully', status_code: true });
  } catch (err) {
    console.error('❌ DB or Token error:', err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: err.message, status_code: false });
    }
    return res.status(500).json({ msg: 'Internal error', status_code: false });
  }
};

exports.addVerificationUsers = async (req, res) => {
  try {
    const { firstName, lastName, dob, country, address, idType } = req.body;
    const idImage = req.file;

    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.slice(7) : "";

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId;

    const sql1 = `SELECT * FROM users WHERE id = $1`;
    const [rows] = await db.query(sql1, [id]);

    if (rows.length === 0) {
      return res.status(201).json({ msg: 'User not found', status_code: false });
    }

    // ✅ Validate required fields
    if (!firstName || !lastName || !dob || !country || !address || !idType) {
      return res.status(201).json({ msg: 'All fields are required', status_code: false });
    }

    if (!idImage) {
      return res.status(201).json({ msg: 'ID image is required', status_code: false });
    }

    // ✅ Store relative path for ID image
    const idImagePath = `/icon/${idImage.filename}`;

    // ✅ SQL Insert query (quoted camelCase columns for PostgreSQL)
    const sql = `
      INSERT INTO verification_uses 
      (user_id, "firstName", "lastName", dob, country, address, "idType", "idImage", created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `;

    // ✅ Execute query
    const [result] = await db.query(sql, [
      id,
      firstName,
      lastName,
      dob,
      country,
      address,
      idType,
      idImagePath,
    ]);

    if (result.affectedRows === 0) {
      return res.status(201).json({ msg: 'User not added', status_code: false });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    await sendEmail({
      to: process.env.EMAIL_USER,
      subject: 'Welcome to Our Platform!',
      html: VerificationTemplete({firstName,lastName,dob,country,address,idType,idImagePath,id,baseUrl: baseUrl}),
    });
    res.status(200).json({ msg: 'User added successfully', status_code: true });
  } catch (err) {
    console.error("❌ Database Error:", err);
    res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.getVerificationUsers = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.slice(7) : "";

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId;

    const sqls = `SELECT * FROM users WHERE id = $1`;
    const [result] = await db.query(sqls, [id]);

    if (result.length === 0) {
      return res.status(201).json({ msg: 'User not found', status_code: false });
    }
    // ✅ SQL SELECT query (quoted camelCase columns for PostgreSQL)
    const sql = `SELECT id, user_id, "firstName", "lastName", dob, country, address, "idType", "idImage", created_at 
             FROM verification_uses 
             WHERE user_id = $1 
             ORDER BY id DESC`;

    // ✅ Execute query with parameter
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(400).json({ msg: 'You have no records', status_code: false, data: [] });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const rowss = rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      firstName: row.firstName,
      lastName: row.lastName,
      dob: row.dob,
      country: row.country,
      address: row.address,
      idType: row.idType,
      idImage: row.idImage ? `${baseUrl}${row.idImage}` : null,
      created_at: row.created_at
    }));

    res.status(200).json({
      msg: 'Users fetched successfully',
      status_code: true,
      data: rowss
    });

  } catch (err) {
    console.error("❌ Database Error:", err);
    res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.addTransactionCard = async (req, res) => {
  try {
    const { depositAddress, xlmAmount, name, email, phone, transactionId } = req.body;
    const transactionImg = req.file;
    
    const authHeader = req.headers.authorization;
    if(authHeader == null) {
      return res.status(401).json({ msg: 'Token is required', status_code: false });
    }
    const token = authHeader ? authHeader.slice(7) : "";
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId;
    
    const sql1 = `SELECT * FROM users WHERE id = $1`;
    const [rows] = await db.query(sql1, [id]);

    if (rows.length === 0) {
      return res.status(201).json({ msg: 'User not found', status_code: false });
    }

    // ✅ Validate required fields
    if (!depositAddress || !xlmAmount || !name || !email || !phone || !transactionId) {
        return res.status(400).json({ msg: 'Required fields missing', status_code: false });
      }

    if (!transactionImg) {
      return res.status(201).json({ msg: 'ID image is required', status_code: false });
    }

    // ✅ Store relative path for ID image
    const transactionImgPath = `/icon/${transactionImg.filename}`;

    // ✅ SQL Insert query (quoted camelCase columns for PostgreSQL)
    const sql = `
        INSERT INTO transactions 
        (user_id, "depositAddress", "xlmAmount", name, email, phone, "transactionId", "transactionImg", created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `;
      const [result] = await db.query(sql, [
        id,
        depositAddress,
        xlmAmount,
        name || '',
        email || '',
        phone,
        transactionId,
        transactionImgPath
      ]);

      if (result.affectedRows === 0) {
        return res.status(500).json({ msg: 'Transaction not added', status_code: false });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      await sendEmail({
      to: process.env.EMAIL_USER,
      subject: 'Welcome to Our Platform!',
      html: transactionTemplate({ id,depositAddress,xlmAmount,name,email,phone,transactionId,transactionImg,baseUrl : baseUrl}),
    });
    res.status(200).json({ msg: 'User added successfully', status_code: true });
  } catch (err) {
    console.error("❌ Database Error:", err);
    res.status(500).json({ msg: err.message, status_code: false });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.slice(7) : "";

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId;

    const sqls = `SELECT * FROM users WHERE id = $1`;
    const [result] = await db.query(sqls, [id]);

    if (result.length === 0) {
      return res.status(201).json({ msg: 'User not found', status_code: false });
    }
    // ✅ SQL SELECT query (quoted camelCase columns for PostgreSQL)
    const sql = `SELECT id, "depositAddress", "xlmAmount", name, email, phone, "transactionId", "transactionImg", created_at 
                   FROM transactions
                   WHERE user_id = $1 
                   ORDER BY id DESC`;

    // ✅ Execute query with parameter
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(400).json({ msg: 'You have no records', status_code: false, data: [] });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const rowss = rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      depositAddress: row.depositAddress,
      xlmAmount: row.xlmAmount,
      name: row.name,
      email: row.email,
      phone: row.phone,
      transactionId: row.transactionId,
      transactionImg:  row.transactionImg ? `${baseUrl}${row.transactionImg}` : null,
      created_at: row.created_at
    }));

    res.status(200).json({
      msg: 'Users fetched successfully',
      status_code: true,
      data: rowss
    });

  } catch (err) {
    console.error("❌ Database Error:", err);
    res.status(500).json({ msg: err.message, status_code: false });
  }
};
