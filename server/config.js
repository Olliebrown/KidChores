// SERVER SIDE CONFIGURATION

// Capture all environment flags currently set
const env = process.env

// Setup an administrator identity / email (like a webmaster)
const ADMIN = 'seth.berrier@gmail.com'

export default {
  // Setup the port and host from environment vars or defaults
  port: env.PORT || 8000,
  host: env.HOST || '0.0.0.0',
  browserSyncPort: 9000,

  // SSL Options
  SSLPort: env.SSL_PORT || 8443,
  SSLKeyFile: './server/ssl.key',
  SSLCertificatefile: './server/ssl.cert',

  // Web Token Options
  JWTPublicKeyFile: './server/jwt_rsa.pub',
  JWTPrivateKeyfile: './server/jwt_rsa.key',
  JWTOptions: {
    issuer: `Kid Chore Tool (${ADMIN})`,
    audience: `Kid Chore Tool Users`,
    expiresIn: '1w',
    algorithm: 'RS256'
  },

  // Database info for SQLite
  databaseFile: './server/data/KidChores_records.db',

  // Return a fully qualified URL with host and port
  get serverUrl () {
    return `https://${this.host}:${this.SSLPort}`
  }
}
