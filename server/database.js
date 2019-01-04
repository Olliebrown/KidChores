import fs from 'fs'

import SQLite3 from 'sqlite3'
import config from './config'

import DBUtil from './databaseUtils'

// Configure SQLite and open database connection
SQLite3.verbose()

// Ensure database is ready
let db
(async () => {
  // If the file doesn't exist, create from scratch
  if (!fs.existsSync(config.databaseFile)) {
    console.log('Building database from scratch')
    db = await DBUtil.recreateDatabase()
    await insertStartingData(db)
  } else {
    // Else, open it and verify it's contents match the schema
    db = new SQLite3.Database(config.databaseFile)
    let isValid = await DBUtil.verifyDatabase(db)
    if (!isValid) {
      console.log('Database does not match schema!! Consider deleting file to rebuild.')
    }
  }
})()

// Data Query SQL
const sqlGetUser = `SELECT * FROM Users WHERE username = ?`
const sqlNewUser = `INSERT INTO Users (firstname, lastname, username, passwordhash) VALUES (?, ?, ?, ?)`
const sqlCategories = `SELECT * FROM Category`
const sqlTasks = `SELECT * FROM Tasks WHERE categoryid = ?`
const sqlInsertCategory = `INSERT INTO Category (name, starthour) VALUES (?, ?)`
const sqlInsertTask = `INSERT INTO Tasks (name, categoryid, value, details) VALUES (?, ?, ?, ?)`

// Promisify a query to retrieve a user
function getUserDB (username) {
  let userStmt = db.prepare(sqlGetUser)
  return new Promise((resolve, reject) => {
    userStmt.all(username, (err, rows) => {
      userStmt.finalize()
      if (err) {
        reject(new Error(`User query Error: ${err}`))
      } else {
        if (rows.length === 0) {
          resolve({})
        } else {
          resolve(rows[0])
        }
      }
    })
  })
}

// Promisify a query to create a user
function newUserDB (firstName, lastName, username, pwhash) {
  let userStmt = db.prepare(sqlNewUser)
  return new Promise((resolve, reject) => {
    userStmt.run(firstName, lastName, username, pwhash, (err) => {
      userStmt.finalize()
      if (err) {
        console.log(err)
        reject(new Error(`User creation Error: ${err}`))
      } else {
        resolve()
      }
    })
  })
}

// Promisify a query to retrieve all categories
function getCategoriesDB () {
  return new Promise((resolve, reject) => {
    db.all(sqlCategories, (err, rows) => {
      if (err) {
        reject(new Error(`Category query Error: ${err}`))
      } else {
        resolve(rows)
      }
    })
  })
}

// Promisify a query to retrieve a task for a given category
function getTasksDB (preparedStmt, catID) {
  return new Promise((resolve, reject) => {
    preparedStmt.all(catID, (err, rows) => {
      if (err) {
        reject(new Error(`Tasks query Error: ${err}`))
      } else {
        resolve(rows)
      }
    })
  })
}

function insertCategoryDB (category) {
  // Rebuild the category table
  return new Promise((resolve, reject) => {
    db.run(sqlInsertCategory, category.name, category.startHour, (err) => {
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
    db.run(sqlInsertTask, task.name, task.categoryid, task.value, task.details, (err) => {
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
  for (let i = 0; i < DBUtil.initData.categories.length; i++) {
    try {
      await insertCategoryDB(DBUtil.initData.categories[i])
    } catch (err) {
      console.log(err)
    }

    // Build the task list while we're at it
    DBUtil.initData.categories[i].tasks.forEach((task) => {
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
      console.log(err)
    }
  }
}

async function retrieveUserJSONObject (username) {
  try {
    let userObj = await getUserDB(username)
    return userObj
  } catch (err) {
    return { error: err }
  }
}

async function createUser (firstName, lastName, username, pwhash) {
  try {
    await newUserDB(firstName, lastName, username, pwhash)
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

    // Prepare the tasks query (which has one parametr)
    let taskStmt = db.prepare(sqlTasks)

    // Loop through the categories and get their tasks
    for (let i = 0; i < categories.length; i++) {
      // Decorate the category with the list of tasks
      let category = categories[i]
      category.tasks = await getTasksDB(taskStmt, category.id)
    }

    // Finalize the statement and return the decorated categories
    taskStmt.finalize()
    return categories
  } catch (err) {
    return { error: err }
  }
}

export default {
  retrieveUserJSONObject,
  createUser,
  retrieveCategoryJSONObject
}
