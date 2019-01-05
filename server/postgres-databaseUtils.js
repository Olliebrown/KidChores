import fs from 'fs'
import config from './config'
import { Pool } from 'pg'

// List of expected table names and their fields
import schema from './data/schema'

// SQL to rebuild the database schema
const REBUILD_SQL = fs.readFileSync('./server/data/rebuild.pg', 'utf8')

// DB Verification Query SQL
const sqlCheckTable = `SELECT count(*) AS found FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' AND tablename = $1`
const sqlGetTables = `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'`
const sqlGetColumns = `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = $1`

// Scrap and rebuild entire database
// NOTE: All data will be lost!!
function rebuildDB () {
  // Reopen as fresh file
  let newDB = new Pool({ connectionString: config.postgresURI, ssl: true })

  // Rebuild schema
  return new Promise((resolve, reject) => {
    newDB.query(REBUILD_SQL, (err) => {
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
    db.query(sqlGetColumns, [tableName], (err, res) => {
      if (err) {
        reject(new Error(`column query Error: ${err}`))
      } else {
        resolve(res.rows)
      }
    })
  })
}

function checkTableDB (db, tableName) {
  return new Promise((resolve, reject) => {
    db.query(sqlCheckTable, [tableName], (err, res) => {
      if (err || res.rows.length < 1) {
        reject(new Error(`table check query Error: ${err}`))
      } else {
        resolve(res.rows[0])
      }
    })
  })
}

function getTablesDB (db) {
  return new Promise((resolve, reject) => {
    db.query(sqlGetTables, (err, res) => {
      if (err) {
        reject(new Error(`tables query Error: ${err}`))
      } else {
        resolve(res.rows)
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
        return (current.name === table.tablename)
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
            return (schemaColumn === dbColumn.column_name)
          })
          if (!found) {
            output.push(`${schemaTable.name}: unexpected column '${dbColumn.column_name}'`)
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
    console.log(err)
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
  verifyDatabase,
  recreateDatabase
}
