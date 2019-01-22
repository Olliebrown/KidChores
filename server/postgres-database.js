import config from './config'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'

// Initial data for database
import initData from './data/TaskData'

// Utility functions for database verification
import DBUtil from './postgres-databaseUtils'

// Connect to database
let db
(async () => {
  // Open Database connection and verify
  db = new Pool({ connectionString: config.postgresURI, ssl: true })
  let isValid = await DBUtil.verifyDatabase(db)
  if (!isValid) {
    console.log('Database does not match schema!! Consider rebuilding')
  } else {
    console.log('Database is valid')
  }
})()

// Data Query SQL
const sqlGetUser = `SELECT * FROM users WHERE username = $1`
const sqlCategories = `SELECT * FROM categories`
const sqlTasks = `SELECT * FROM tasks WHERE categoryid = $1`
const sqlCompletedTasks = `SELECT * FROM completedtasks WHERE userid = $1 AND dayepoch = $2`

const sqlUpdateUserToken = `UPDATE users SET token = $2, tokenissued = $3 WHERE username = $1`
const sqlUpdateUserDetails = `UPDATE users SET firstname = $2, lastname = $3 WHERE username = $1`
const sqlUpdateUserPassword = `UPDATE users SET passwordhash = $4 WHERE username = $1`
const sqlUpdateCompletedTasks = `UPDATE completedtasks SET tasks = $3 WHERE userid = $1 AND dayepoch = $2`

const sqlNewUser = `INSERT INTO users (firstname, lastname, username, usertype, passwordhash) VALUES ($1, $2, $3, $4, $5)`
const sqlInsertCategory = `INSERT INTO categories (name, starthour) VALUES ($1, $2)`
const sqlInsertTask = `INSERT INTO tasks (name, categoryid, value, details) VALUES ($1, $2, $3, $4)`
const sqlInsertCompletedTasks = `INSERT INTO completedtasks ( userid, dayepoch, tasks) VALUES ($1, $2, $3)`

// Promisify a query to retrieve a user
function getUserDB (username) {
  return new Promise((resolve, reject) => {
    db.query(sqlGetUser, [username], (err, res) => {
      if (err) {
        reject(new Error(`User query Error: ${err}`))
      } else {
        if (res.rows.length === 0) {
          resolve()
        } else {
          resolve(res.rows[0])
        }
      }
    })
  })
}

// Promisify a query to update a user's token
function updateUserTokenDB (username, JWToken, JWTIssueEpoch) {
  return new Promise((resolve, reject) => {
    db.query(sqlUpdateUserToken, [username, JWToken, JWTIssueEpoch], (err, res) => {
      if (err) {
        reject(new Error(`User update token query Error: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

// Promisify a query to update a user's details
function updateUserDetailsDB (username, firstname, lastname) {
  return new Promise((resolve, reject) => {
    db.query(sqlUpdateUserDetails, [username, firstname, lastname], (err, res) => {
      if (err) {
        reject(new Error(`User update details query Error: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

// Promisify a query to update a user's password
function updateUserPasswordDB (username, pwhash) {
  return new Promise((resolve, reject) => {
    db.query(sqlUpdateUserPassword, [username, pwhash], (err, res) => {
      if (err) {
        reject(new Error(`User update passowrd query Error: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

// Promisify a query to create a user
function newUserDB (firstname, lastname, username, usertype, pwhash) {
  return new Promise((resolve, reject) => {
    db.query(sqlNewUser, [firstname, lastname, username, usertype, pwhash], (err) => {
      if (err) {
        console.log(err)
        reject(new Error(`User creation Error: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

// Promisify a query to retrieve completed tasks for a given day and user
function getCompletedTasksDB (userid, dayepoch) {
  return new Promise((resolve, reject) => {
    db.query(sqlCompletedTasks, [userid, dayepoch], (err, res) => {
      if (err) {
        reject(new Error(`Completed Tasks query Error: ${err}`))
      } else {
        resolve(res.rows[0])
      }
    })
  })
}

// Promisify a query to insert a new row of completed tasks
function createCompletedTasksDB (userid, dayepoch, tasks) {
  return new Promise((resolve, reject) => {
    db.query(sqlInsertCompletedTasks, [userid, dayepoch, tasks], (err, res) => {
      if (err) {
        reject(new Error(`Completed Tasks creation query Error: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

// Promisify a query to update completed tasks for a given day and user
function updateCompletedTasksDB (userid, dayepoch, tasks) {
  return new Promise((resolve, reject) => {
    db.query(sqlUpdateCompletedTasks, [userid, dayepoch, tasks], (err, res) => {
      if (err) {
        reject(new Error(`Completed Tasks update query Error: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

// Promisify a query to retrieve all categories
function getCategoriesDB () {
  return new Promise((resolve, reject) => {
    db.query(sqlCategories, (err, res) => {
      if (err) {
        reject(new Error(`Category query Error: ${err}`))
      } else {
        resolve(res.rows)
      }
    })
  })
}

// Promisify a query to retrieve a task for a given category
function getTasksDB (catID) {
  return new Promise((resolve, reject) => {
    db.query(sqlTasks, [catID], (err, res) => {
      if (err) {
        reject(new Error(`Tasks query Error: ${err}`))
      } else {
        resolve(res.rows)
      }
    })
  })
}

function insertCategoryDB (category) {
  // Rebuild the category table
  return new Promise((resolve, reject) => {
    db.query(sqlInsertCategory, [category.name, category.startHour], (err) => {
      if (err) {
        reject(new Error(`Failed to add category: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

function insertTaskDB (task) {
  // Rebuild the category table
  return new Promise((resolve, reject) => {
    db.query(sqlInsertTask, [task.name, task.categoryid, task.value, task.details], (err) => {
      if (err) {
        reject(new Error(`Failed to add task: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

async function insertStartingData (db) {
  // Hold complete list of tasks
  let tasks = []

  // Rebuild the category table
  for (let i = 0; i < initData.categories.length; i++) {
    try {
      await insertCategoryDB(initData.categories[i])
    } catch (err) {
      console.log(`Category creation failed: ${err}`)
    }

    // Build the task list while we're at it
    initData.categories[i].tasks.forEach((task) => {
      tasks.push({
        name: task.name,
        categoryid: i + 1,
        value: task.value,
        details: task.details
      })
    })
  }

  // Rebuild the task table
  for (let i = 0; i < tasks.length; i++) {
    try {
      await insertTaskDB(tasks[i])
    } catch (err) {
      console.log(`Task creation failed: ${err}`)
    }
  }

  // Add default root user
  try {
    let newPW = bcrypt.hashSync(config.rootDefaultPassword, 10)
    await createUser('Root', 'User', config.rootDefaultUsername, 'parent', newPW)
  } catch (err) {
    console.log(`User creation failed: ${err}`)
  }
}

async function retrieveUserJSONObject (username) {
  try {
    let userObj = await getUserDB(username)
    if (!userObj) {
      throw new Error('Username not found')
    }
    return userObj
  } catch (err) {
    return { error: err }
  }
}

async function updateUserToken (username, JWToken, JWTIssueEpoch) {
  try {
    await updateUserTokenDB(username, JWToken, JWTIssueEpoch)
    return { success: true }
  } catch (err) {
    return { success: false, error: err }
  }
}

async function updateUserDetails (username, firstname, lastname) {
  try {
    await updateUserDetailsDB(username, firstname, lastname)
    return { success: true }
  } catch (err) {
    return { success: false, error: err }
  }
}

async function updateUserPassword (username, pwhash) {
  try {
    await updateUserPasswordDB(username, pwhash)
    return { success: true }
  } catch (err) {
    return { success: false, error: err }
  }
}

async function createUser (firstname, lastname, username, usertype, pwhash) {
  try {
    await newUserDB(firstname, lastname, username, usertype, pwhash)
    return { success: true }
  } catch (err) {
    return { success: false, error: err }
  }
}

// Create a JS object with the categories and tasks all in one
async function retrieveCategoryJSONObject () {
  try {
    // Wait for the promised categories
    let categories = await getCategoriesDB()

    // Loop through the categories and get their tasks
    for (let i = 0; i < categories.length; i++) {
      // Decorate the category with the list of tasks
      let category = categories[i]
      category.tasks = await getTasksDB(category.id)
    }

    // Return the decorated categories
    return categories
  } catch (err) {
    return { error: err }
  }
}

async function retrieveCompletedTasks (userid, dayepoch, tasks) {
  try {
    let result = await getCompletedTasksDB(userid, dayepoch, tasks)
    return (result)
  } catch (err) {
    return ({ error: err })
  }
}

async function updateCompletedTasks (userid, dayepoch, tasks) {
  try {
    await updateCompletedTasksDB(userid, dayepoch, tasks)
    return ({ success: true })
  } catch (err) {
    return ({ success: false, error: err })
  }
}

async function createCompletedTasks (userid, dayepoch, tasks) {
  try {
    await createCompletedTasksDB(userid, dayepoch, tasks)
    return ({ success: true })
  } catch (err) {
    return ({ success: false, error: err })
  }
}

export default {
  createUser,
  createCompletedTasks,
  updateUserToken,
  updateUserDetails,
  updateUserPassword,
  updateCompletedTasks,
  retrieveUserJSONObject,
  retrieveCategoryJSONObject,
  retrieveCompletedTasks
}
