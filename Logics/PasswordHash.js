const CryptoJS = require('crypto-js')

const secretKey = '123BrightoN';

// Encrypt a password
function encryptPassword(password) {
  return CryptoJS.AES.encrypt(password, secretKey).toString();
}

// Decrypt a password
function decryptPassword(encryptedPassword) {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8); // Convert decrypted bytes back to string
}

  module.exports={
    encryptPassword,
    decryptPassword
  }