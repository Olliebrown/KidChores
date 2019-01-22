// Import packages used below
import express from 'express'
import expressJWT from 'express-jwt'
import JWT from './jwthelper'
import bodyParser from 'body-parser'

// Import bcrypt for hasing and validating passwords
import bcrypt from 'bcrypt'

// Interface to SQLite3 database
import DB from './postgres-database'

// Create JWT authorization middleware
let authorizer = expressJWT({ secret: JWT.publicKEY })

// Build the data router
let dataRouter = new express.Router()

// Check if a username exists
dataRouter.get('/checkuser/:username', async (req, res) => {
  let user = await DB.retrieveUserJSONObject(req.params.username)
  if (user.error) {
    res.json({ error: user.error })
  } else {
    res.json({ id: user.id, username: user.username, firstname: user.firstname, lastname: user.lastname })
  }
})

// Parse body of request as it is encoded
dataRouter.use(bodyParser.json())
dataRouter.use(bodyParser.urlencoded({ extended: true }))

dataRouter.post('/authorize', async (req, res) => {
  if (req.body.token) {
    // Authorize via token
    let result = JWT.validateToken(req.body.token)
    res.json(result)
  } else {
    // Authorize via username and password
    let user = await DB.retrieveUserJSONObject(req.body.username)
    if (user.error) {
      res.json({ success: false, error: user.error })
    } else {
      if (!bcrypt.compareSync(req.body.password, user.passwordhash)) {
        res.json({ success: false, error: 'Incorrect username or password' })
      } else {
        let token = JWT.createToken(user.username, user.usertype, '1w', { firstname: user.firstname })
        let issued = new Date().valueOf()
        DB.updateUserToken(user.username, token, issued)
        user.success = true
        user.token = token
        user.tokenissued = issued
        user.passwordhash = undefined
        res.json(user)
      }
    }
  }
})

// NOTE: User must be logged in for the rest of the routes below to work

// Make a new user with the given information
dataRouter.post('/newuser', authorizer, async (req, res) => {
  if (req.user.usertype !== 'parent') {
    res.status(403).json({ error: 'Not privledged' })
  } else {
    let pwhash = bcrypt.hashSync(req.body.password, 10)
    let result = await DB.createUser(req.body.firstname, req.body.lastname, req.body.username, req.body.usertype, pwhash)
    res.json(result)
  }
})

// Update an existing user with the given information
dataRouter.post('/updateuser', authorizer, async (req, res) => {
  if (req.user.usertype !== 'parent') {
    res.status(403).json({ error: 'Not privledged' })
  } else {
    // First, retrieve the old user
    let user = await DB.retrieveUserJSONObject(req.body.username)
    if (user.error) {
      res.json({ success: false, error: user.error })
    } else {
      // Second, verify the old password
      if (!bcrypt.compareSync(req.body.oldpassword, user.passwordhash)) {
        res.json({ success: false, error: 'Incorrect username or old password' })
      } else {
        // Third, send the user details first
        let result = await DB.updateUserDetails(req.body.username, req.body.firstname, req.body.lastname)

        // Last, update the password if it was provided
        if (req.body.newpassword) {
          let pwhash = bcrypt.hashSync(req.body.newpassword, 10)
          await DB.updateUserDetails(req.body.username, pwhash)
        }

        // Respond with the results of the details udpate
        res.json(result)
      }
    }
  }
})

// Retrieve a list of all categories including their tasks
dataRouter.get('/categories', authorizer, async (req, res) => {
  let result = await DB.retrieveCategoryJSONObject()
  if (result.error) {
    res.status(500).json(result)
  } else {
    res.json({ categories: result })
  }
})

// Retrieve a list of all tasks completed for a given user on a given day
dataRouter.post('/updatecompleted', authorizer, async (req, res) => {
  if (req.user.sub !== req.body.username && req.user.usertype !== 'parent') {
    res.status(403).json({ error: 'Not privledged' })
  } else {
    // Lookup user details for userid
    let user = await DB.retrieveUserJSONObject(req.body.username)
    if (user.error) {
      res.status(401).json({ error: user.error })
    } else {
      // Get clean list of tasks
      let tasks = JSON.parse(req.body.tasks) || []
      // Check if there's an entry for this user and date
      let existing = await DB.retrieveCompletedTasks(user.id, req.body.datecode)
      if (!existing || existing.error) {
        let result = await DB.createCompletedTasks(user.id, req.body.datecode, tasks)
        res.status(result.success ? 200 : 500).json(result)
      } else {
        let result = await DB.updateCompletedTasks(user.id, req.body.datecode, tasks)
        res.status(result.success ? 200 : 500).json(result)
      }
    }
  }
})

// Retrieve a list of all tasks completed for a given user on a given day
dataRouter.post('/completedtasks/', authorizer, async (req, res) => {
  if (req.user.sub !== req.body.username && req.user.usertype !== 'parent') {
    res.status(403).json({
      error: 'Not privledged',
      subject: req.user.sub,
      user: req.body.username,
      type: req.user.usertype
    })
  } else {
    // Lookup user details for userid
    let user = await DB.retrieveUserJSONObject(req.body.username)
    if (user.error) {
      res.status(401).json({ error: user.error })
    } else {
      let result = await DB.retrieveCompletedTasks(user.id, req.body.datecode)
      if (!result) {
        res.status(404).json({ error: 'not found' })
      } else if (result.error) {
        res.status(500).json(result)
      } else {
        res.json(result)
      }
    }
  }
})

// Simplify the jwt error messages
dataRouter.use((err, req, res, next) => {
  console.log(`${err.name}: ${err.message}`)
  if (err.name === 'UnauthorizedError') {
    // Overriding the default error handler
    res.status(401).json({ err: `${err.name}: ${err.message}` })
  }
})

export default dataRouter
