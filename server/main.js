// Bring in express as our server
import Express from 'express'

// Bring in configuration from the config.js file
import config from './config'

// Load the data API router
import dataRouter from './data_api'

// Create a new express server
const server = new Express()

// Log all requests
server.use((req, res, next) => {
  console.info(`${req.method} at ${req.url}`)
  next()
})

// Attach the router for the data api
server.use('/data', dataRouter)

// Serve all other files in the public folder statically
server.use(Express.static('public'))

server.listen(config.port, config.host, () => {
  console.info(`Server listening on port ${config.port}`)
})
