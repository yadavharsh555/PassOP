# 🔑 PassOP Secure Vault

PassOP is an enterprise-grade, zero-knowledge, cloud-integrated Password Manager and browser Chrome Extension. It is designed to prioritize real-world security practices, keeping your vault data safe from eavesdropping, database leaks, and automated brute-force attacks.

---

## 🔒 Security Architecture & Features

PassOP implements a zero-knowledge architecture. No plaintext master passwords ever leave your browser or are stored on the database.

* **Client-Side Pre-Hashing:** When registering or logging in, the master password is pre-hashed using **SHA-256** hex natively via the browser's **Web Crypto API** *before* sending it over the network.
* **Server-Side Bcrypt Hashing:** The API server hashes the client-side pre-hash again using **bcryptjs (10 rounds)** before database storage.
* **AES-256-CBC Vault Encryption:** All credentials (website URLs, usernames, and passwords) are encrypted in the browser and stored as ciphertext with a random 16-byte Initialization Vector (IV).
* **Brute-Force Rate Limiting:** Built-in network limiters guard sensitive endpoints (login, signup, OTP validation) to protect against credential stuffing and OTP code guessing.
* **XSS Sanitization:** Input sanitizers strip malicious HTML tags from input fields to prevent Stored Cross-Site Scripting (XSS) attacks.

---

## 🚀 Tech Stack

* **Frontend:** React, Vite, TailwindCSS (Premium glassmorphic dashboard)
* **Backend:** Node.js, Express (Hosted on Vercel Serverless)
* **Database:** MongoDB Atlas (Cloud clustering)
* **Mailing Gateway:** Gmail SMTP App Password system with firewall-proof configurations.

---

## 🧩 How to Install the Chrome Extension (100% Free)

You can run this password manager directly in your browser toolbar without downloading it from the store:

1. Download the latest **`PassOP-Vault-Extension.zip`** from the **[Releases](https://github.com/yadavharsh555/PassOP/releases)** tab of this repository.
2. Extract (unzip) the downloaded zip file on your computer.
3. Open Google Chrome and navigate to: **`chrome://extensions/`**
4. In the top-right corner, toggle the **Developer mode** switch to **ON**.
5. Click the **Load unpacked** button in the top-left corner.
6. Select the extracted folder containing the extension files.
7. Click the extension puzzle piece icon 🧩 in your Chrome toolbar, find **PassOP Secure Vault**, and click the pin icon 📌 to keep it in your toolbar.

---

## 💻 Local Setup & Development

### 1. Setup Backend
1. Go to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `Backend/.env` file with the following variables:
   ```env
   MongoDBURI="your_mongodb_atlas_uri"
   JWT_SECRET="your_jwt_secret"
   ENCRYPTION_SECRET="your_aes_secret"
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=465
   SMTP_USER="your_sender_gmail@gmail.com"
   SMTP_PASS="your_gmail_app_password"
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 2. Setup Frontend
1. Go to the root directory and install dependencies:
   ```bash
   npm install
   ```
2. Create a root `.env` file pointing to your backend:
   ```env
   VITE_API_URL="http://localhost:3000"
   ```
3. Run the development build:
   ```bash
   npm run dev
   ```
4. To compile the production build for the Chrome Extension:
   ```bash
   npm run build
   ```
   This compiles all static assets and the `manifest.json` into the `/dist` folder, which is ready to load into Chrome!
