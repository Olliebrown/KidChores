// SERVER SIDE CONFIGURATION
import fs from 'fs'

// Capture all environment flags currently set
const env = process.env

// Setup an administrator identity / email (like a webmaster)
const ADMIN = 'seth.berrier@gmail.com'

export default {
  // Setup the port and host from environment vars or defaults
  port: env.PORT || 8000,
  host: env.HOST_APP || '0.0.0.0',
  browserSyncPort: 9000,

  // Test if running deployed on heroku
  get HEROKU () {
    return (env.NODE && ~env.NODE.indexOf('heroku'))
  },

  // SSL Options
  SSLPort: env.SSL_PORT || 8443,
  get SSLKey () {
    if (this.HEROKU) {
      console.log(env.SSL_CERT_KEY)
      return env.SSL_CERT_KEY
    } else {
      return fs.readFileSync('./server/ssl.key', 'utf8')
    }
  },
  get SSLCertificate () {
    if (this.HEROKU) {
      console.log(env.SSL_CERT)
      return env.SSL_CERT
    } else {
      return fs.readFileSync('./server/ssl.cert', 'utf8')
    }
  },

  // Web Token Options
  get JWTPublicKey () {
    if (this.HEROKU) {
      return env.JWT_PUBLIC_KEY
    } else {
      return fs.readFileSync('./server/jwt_rsa.pub', 'utf8')
    }
  },
  get JWTPrivateKey () {
    if (this.HEROKU) {
      return env.JWT_PRIVATE_KEY
    } else {
      return fs.readFileSync('./server/jwt_rsa.key', 'utf8')
    }
  },
  JWTOptions: {
    issuer: `Kid Chore Tool (${ADMIN})`,
    audience: `Kid Chore Tool Users`,
    expiresIn: '1w',
    algorithm: 'RS256'
  },

  // Database info for SQLite
  databaseFile: './server/data/KidChores_records.db',

  // Database info for Postgres
  postgresURI: env.DATABASE_URL || 'postgres://nbljjfkkqqnlbt:6f200ace17958313995abdde5d849c96dd79f3d5017f33478ad5e6aa919b63d9@ec2-54-235-77-0.compute-1.amazonaws.com:5432/d69p2to0ouq8vd',

  // Return a fully qualified URL with host and port
  get serverUrl () {
    return `https://${this.host}:${this.SSLPort}`
  }
}
