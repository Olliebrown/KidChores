import express from 'express'
import expressJWT from 'express-jwt'
import JWT from './jwthelper'
import bodyParser from 'body-parser'

// Interface to SQLite3 database
import DB from './database'

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
    res.json(user)
  }
})

// Parse body of request as it is encoded
dataRouter.use(bodyParser.json())
dataRouter.use(bodyParser.urlencoded({ extended: true }))

// Make a new user with the given information
dataRouter.post('/newuser/', async (req, res) => {
  console.log(`Making user '${req.body.username}' (${req.body.firstName} ${req.body.lastName}) with hash '${req.body.pwHash}'`)
  let result = await DB.createUser(req.body.firstName, req.body.lastName, req.body.username, req.body.pwHash)
  res.json(result)
})

// NOTE: User must be logged in for the rest of the routes below to work

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
dataRouter.get('/daily/:user/:datecode', authorizer, async (req, res) => {
  if (req.user.subject !== req.params.user && req.user.usertype !== 'parent') {
    res.status(403).json({ error: 'Not privledged' })
  } else {
    let result = await DB.retrieveCompletedJSONObject(req.params.user, req.params.datecode)
    if (result.error) {
      res.status(500).json(result)
    } else {
      res.json({ categories: result })
    }
  }
})

export default dataRouter
