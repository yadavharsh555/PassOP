const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const Passop = require("./models/passop");
const User = require("./models/user");
const OTP = require("./models/otp");
const { encrypt, decrypt } = require("./utils/crypto");
const { sendOTPEmail } = require("./utils/mailer");

const app = express();
const PORT = process.env.PORT || 3000;
const URI = process.env.MongoDBURI || "mongodb://localhost:27017/passop";
const JWT_SECRET = process.env.JWT_SECRET || "PassOP_JWT_Super_Secret_Salt_Key";

// ================= SECURITY HEADERS & LIMITERS =================

// 1. Helmet Security Headers (Disable CSP locally to prevent CORS conflicts with local Vite app)
app.use(helmet({ contentSecurityPolicy: false }));

// 2. Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests from this IP. Please try again later." }
});
app.use(globalLimiter);

// 3. Brute-Force Auth Limiter (Signup, Login, Forgot, Reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit to 15 authentication requests per 15 minutes
  message: { error: "Brute-force protection: Too many requests. Please try again after 15 minutes." }
});

// 4. Brute-Force OTP Limiter (Verify OTP)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 6, // Limit to 6 OTP validation attempts per 10 minutes
  message: { error: "Security alert: Too many OTP attempts. Please try again after 10 minutes." }
});

// ================= CORE MIDDLEWARE =================
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose
  .connect(URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB: ", error);
  });

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Security Helper: Strip HTML tags to block Stored XSS script injection attacks
function sanitizeInput(str) {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, ""); // Strips all HTML tags
}

// Security Helper: Generate 6-digit Numeric OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ================= AUTH & VERIFICATION ROUTES =================

// Signup Route (With Auth rate limit)
app.post("/api/auth/signup", authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      console.warn("Signup Bad Request: Missing fields:", { username, email, password: !!password });
      return res.status(400).json({ error: "All fields are required" });
    }

    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email: sanitizedEmail }, { username: sanitizedUsername }],
    });

    if (user) {
      if (user.isVerified) {
        console.warn("Signup Bad Request: Verified user already exists:", { username, email });
        return res
          .status(400)
          .json({ error: "Username or Email already registered" });
      }
      
      // If unverified, update password & details in case they made typo
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.username = sanitizedUsername;
      await user.save();
    } else {
      // Create new unverified user
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        username: sanitizedUsername,
        email: sanitizedEmail,
        password: hashedPassword,
        isVerified: false,
      });
      await user.save();
    }

    // Generate Verification OTP
    const otpCode = generateOTP();

    // Remove previous OTPs
    await OTP.deleteMany({ email: user.email, purpose: "verification" });

    // Save OTP
    const otpRecord = new OTP({
      email: user.email,
      otp: otpCode,
      purpose: "verification",
    });
    await otpRecord.save();

    // Send OTP email
    await sendOTPEmail(
      user.email,
      "Verify Your PassOP Account",
      otpCode,
      "email verification"
    );

    res.status(201).json({
      message: "One-Time Password (OTP) sent to your email",
      email: user.email,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error during signup" });
  }
});

// Verify OTP Route (With OTP rate limit protection)
app.post("/api/auth/verify-otp", otpLimiter, async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP code are required" });
    }

    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      email: sanitizedEmail,
      otp,
      purpose: "verification",
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP code" });
    }

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    user.isVerified = true;
    await user.save();

    // Clean OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate JWT Token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log(`SUCCESS: User verified successfully: ${sanitizedEmail}`);

    res.status(200).json({
      message: "Account verified and loaded successfully",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Internal server error during OTP verification" });
  }
});

// Resend OTP Route (With Auth rate limit)
app.post("/api/auth/resend-otp", authLimiter, async (req, res) => {
  const { email, purpose } = req.body;

  try {
    if (!email || !purpose) {
      return res.status(400).json({ error: "Email and purpose are required" });
    }

    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    if (purpose === "verification") {
      const user = await User.findOne({ email: sanitizedEmail });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.isVerified) {
        return res.status(400).json({ error: "Account is already verified" });
      }
    }

    const otpCode = generateOTP();

    await OTP.deleteMany({ email: sanitizedEmail, purpose });

    const otpRecord = new OTP({
      email: sanitizedEmail,
      otp: otpCode,
      purpose,
    });
    await otpRecord.save();

    const subject = purpose === "verification" ? "Verify Your PassOP Account" : "Reset Your Master Password";
    const desc = purpose === "verification" ? "email verification" : "password reset";

    await sendOTPEmail(sanitizedEmail, subject, otpCode, desc);

    res.status(200).json({ message: "A new One-Time Password (OTP) was sent" });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Internal server error sending OTP" });
  }
});

// Forgot Password Route (With Auth rate limit)
app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }

    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    // Find User
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(404).json({ error: "No account registered with this email" });
    }

    const otpCode = generateOTP();

    await OTP.deleteMany({ email: user.email, purpose: "reset" });

    const otpRecord = new OTP({
      email: user.email,
      otp: otpCode,
      purpose: "reset",
    });
    await otpRecord.save();

    await sendOTPEmail(
      user.email,
      "Reset Your Master Password",
      otpCode,
      "password reset"
    );

    res.status(200).json({
      message: "Reset code (OTP) sent successfully",
      email: user.email,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal server error during password reset request" });
  }
});

// Reset Password Route (With OTP rate limit)
app.post("/api/auth/reset-password", otpLimiter, async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    // Find valid OTP record
    const otpRecord = await OTP.findOne({
      email: sanitizedEmail,
      otp,
      purpose: "reset",
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.isVerified = true; // Auto-verify on reset
    await user.save();

    // Clean OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    console.log(`SUCCESS: Master password reset successfully for ${sanitizedEmail}`);

    res.status(200).json({ message: "Master password updated successfully. You can now log in!" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ error: "Internal server error resetting password" });
  }
});

// Login Route (With Auth rate limit)
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { identifier, password } = req.body;

  try {
    if (!identifier || !password) {
      console.warn("Login Bad Request: Missing fields:", { identifier, password: !!password });
      return res.status(400).json({ error: "All fields are required" });
    }

    const sanitizedIdentifier = sanitizeInput(identifier);

    // Find user
    const user = await User.findOne({
      $or: [{ email: sanitizedIdentifier.toLowerCase() }, { username: sanitizedIdentifier }],
    });
    if (!user) {
      console.warn("Login Bad Request: User not found:", { identifier });
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.warn("Login Bad Request: Password mismatch for user:", { identifier });
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check Verification Status
    if (!user.isVerified) {
      console.warn("Login Bad Request: Account not verified yet:", { identifier });
      
      const otpCode = generateOTP();
      await OTP.deleteMany({ email: user.email, purpose: "verification" });
      const otpRecord = new OTP({
        email: user.email,
        otp: otpCode,
        purpose: "verification",
      });
      await otpRecord.save();
      await sendOTPEmail(user.email, "Verify Your PassOP Account", otpCode, "email verification");

      return res.status(400).json({
        error: "Account not verified. A verification code has been resent to your email.",
        unverified: true,
        email: user.email,
      });
    }

    // Create JWT Token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// Get User Profile details
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error checking session" });
  }
});

// ================= VAULT CREDENTIALS ROUTES =================

// GET all passwords for authenticated user
app.get("/", authenticateToken, async (req, res) => {
  try {
    const passwords = await Passop.find({ user: req.user.id });
    
    const decryptedPasswords = passwords.map((p) => {
      let decryptedVal = "";
      try {
        decryptedVal = decrypt(p.password, p.iv);
      } catch (err) {
        console.error(`Failed to decrypt password for site ${p.site}:`, err);
        decryptedVal = "Decryption Failed";
      }

      return {
        id: p.id,
        site: p.site,
        username: p.username,
        password: decryptedVal,
      };
    });

    res.json(decryptedPasswords);
  } catch (err) {
    console.error("Fetch passwords error:", err);
    res.status(500).send("Error fetching credentials from vault");
  }
});

// POST save / update a password (With input XSS sanitization)
app.post("/", authenticateToken, async (req, res) => {
  const { id, site, username, password } = req.body;

  try {
    if (!id || !site || !username || !password) {
      return res.status(400).send("All fields are required");
    }

    const sanitizedSite = sanitizeInput(site);
    const sanitizedUsername = sanitizeInput(username);

    const { encryptedData, iv } = encrypt(password);

    const passwordRecord = new Passop({
      user: req.user.id,
      id,
      site: sanitizedSite,
      username: sanitizedUsername,
      password: encryptedData,
      iv,
    });

    await passwordRecord.save();
    console.log(`Saved encrypted password for ${sanitizedSite}`);
    res.send("Password saved successfully in secure vault");
  } catch (err) {
    console.error("Save password error:", err);
    res.status(500).send("Error saving credentials to vault");
  }
});

// DELETE a password
app.delete("/", authenticateToken, async (req, res) => {
  const { id } = req.body;

  try {
    if (!id) {
      return res.status(400).send("Password ID is required");
    }

    const result = await Passop.deleteOne({ id, user: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).send("Password not found or unauthorized");
    }

    console.log(`Deleted password ID: ${id}`);
    res.send("Password was deleted successfully");
  } catch (err) {
    console.error("Delete password error:", err);
    res.status(500).send("Error deleting credentials");
  }
});

// Listen
app.listen(PORT, () => {
  console.log(`PassOP secure server running on port ${PORT}`);
});
