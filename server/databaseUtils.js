import fs from 'fs'

import SQLite3 from 'sqlite3'
import config from './config'

// List of expected table names and their fields
import schema from './data/schema'

// Initial data for database
import initData from './data/TaskData'

// SQL to rebuild the database schema
const REBUILD_SQL = fs.readFileSync('./server/data/rebuild.sql', 'utf8')

// DB Verification Query SQL
const sqlCheckTable = `SELECT count(*) AS found FROM sqlite_master WHERE type='table' AND name=?`
const sqlGetTables = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`

// Scrap and rebuild entire database
// NOTE: All data will be lost!!
function rebuildDB () {
  // Delete the file if it exists
  if (fs.existsSync(config.databaseFile)) {
    fs.unlinkSync(config.databaseFile)
  }

  // Reopen as fresh file
  let newDB = new SQLite3.Database(config.databaseFile)

  // Rebuild schema
  return new Promise((resolve, reject) => {
    newDB.exec(REBUILD_SQL, (err) => {
      if (err) {
        reject(new Error(`Rebuild Error: ${err}`))
      } else {
        resolve(newDB)
      }
    })
  })
}

// Validate Database
function getColumnsDB (db, tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(new Error(`column query Error: ${err}`))
      } else {
        resolve(rows)
      }
    })
  })
}

function checkTableDB (db, tableName) {
  let tableStmt = db.prepare(sqlCheckTable)
  return new Promise((resolve, reject) => {
    tableStmt.all(tableName, (err, rows) => {
      tableStmt.finalize()
      if (err || rows.length < 1) {
        reject(new Error(`table check query Error: ${err}`))
      } else {
        resolve(rows[0])
      }
    })
  })
}

function getTablesDB (db) {
  return new Promise((resolve, reject) => {
    db.all(sqlGetTables, (err, rows) => {
      if (err) {
        reject(new Error(`tables query Error: ${err}`))
      } else {
        resolve(rows)
      }
    })
  })
}

async function verifyDatabase (db) {
  try {
    // Are all the tables in the DB supposed to be there?
    let tables = await getTablesDB(db)
    let badTable = tables.find((table) => {
      let found = schema.tables.find((current) => {
        return (current.name === table.name)
      })
      return (found === undefined)
    })

    if (badTable) {
      console.log(`Unexpected table: ${badTable.name}`)
      return false
    }

    // Are any tables missing?
    let missingTables = schema.tables.reduce(async (output, schemaTable) => {
      let result = await checkTableDB(db, schemaTable.name)
      if (output.then) { output = await output }
      if (result.found === 0) { output.push(schemaTable.name) }
      return output
    }, [])

    missingTables = await missingTables
    if (missingTables.length > 0) {
      console.log(`Missing tables: ${JSON.stringify(missingTables)}`)
      return false
    }

    // Check the columns in each table
    let invalidTables = schema.tables.reduce(async (output, schemaTable) => {
      let columns = await getColumnsDB(db, schemaTable.name)
      if (output.then) { output = await output }

      // Check column counts match
      if (schemaTable.columns.length !== columns.length) {
        output.push(`${schemaTable.name}: ${columns.length} columns but ${schemaTable.columns.length} expected`)
      } else {
        // Check column names match
        columns.forEach((dbColumn, i) => {
          let found = schemaTable.columns.find((schemaColumn) => {
            return (schemaColumn === dbColumn.name)
          })
          if (!found) {
            output.push(`${schemaTable.name}: unexpected column '${dbColumn.name}'`)
          }
        })
      }
      return output
    }, [])

    invalidTables = await invalidTables
    if (invalidTables.length > 0) {
      console.log(`Invalid tables: ${JSON.stringify(invalidTables)}`)
      return false
    }

    return true
  } catch (err) {
    return false
  }
}

async function recreateDatabase () {
  try {
    let newDB = await rebuildDB()
    return newDB
  } catch (err) {
    console.log(`Rebuild failed: ${err}`)
    return undefined
  }
}

export default {
  initData,
  verifyDatabase,
  recreateDatabase
}
