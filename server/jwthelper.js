// Easy to use JWT implementation
import jwt from 'jsonwebtoken'

// Global configuration options
import config from './config'

// PRIVATE and PUBLIC key
let privateKEY = config.JWTPrivateKey
let publicKEY = config.JWTPublicKey

// Create a JWT for use when authorizing a user
// WARNING: Make sure you verify the user before issuing a token
function createToken (username, usertype, expiresIn = '1w', extraPayload) {
  // Set the standard options
  let tokenOptions = {
    subject: username,
    usertype: usertype,
    issuer: config.JWTOptions.issuer,
    audience: config.JWTOptions.audience,
    expiresIn: expiresIn
  }

  // Default to an empty payload
  extraPayload = extraPayload || {}

  // Try and create the token
  try {
    let newToken = jwt.sign(extraPayload, privateKEY, tokenOptions)
    return newToken
  } catch (err) {
    console.error(`Failed to create token - ${err}`)
  }
}

// Ensure a given token has not expired and was not tampered with
function validateToken (token) {
  let decoded = {}
  try {
    let decoded = jwt.verify(token, publicKEY)
    decoded.signatureValid = true
  } catch (err) {
    decoded.signatureValid = false
    decoded.error = err
  }
  return decoded
}

// Export functions for use in other modules
export default {
  createToken,
  validateToken,
  publicKEY
}
