// Functions for the main web page that deal with data retrieval

// Import jQuery as the usual '$' variable
import $ from 'jquery'

// Import configuration info and utility functions
import { makeAJAXSettings } from './utils'

async function getCompletedTasks (username, datecode) {
  return new Promise((resolve, reject) => {
    let AJAXSettings = makeAJAXSettings(
      '/data/completedtasks/',
      (data) => {
        if (data.error) {
          reject(new Error(`Error retrieving complete tasks: ${data.error}`))
        } else {
          resolve(data)
        }
      },
      { username, datecode }
    )

    $.post(AJAXSettings)
      .fail((jqXHR, textStatus) => {
        if (jqXHR.status === 401 || jqXHR.status === 403) {
          resolve({ unauthorized: true })
        } else {
          reject(new Error(`Failed to retrieve completed task data (${jqXHR.status})`))
        }
      })
  })
}

async function updateCompletedTasks (username, datecode, tasks) {
  return new Promise((resolve, reject) => {
    let AJAXSettings = makeAJAXSettings(
      '/data/updatecompleted/',
      (data) => {
        if (data.error) {
          reject(new Error(`Error updating complete tasks: ${data.error}`))
        } else {
          resolve(data)
        }
      },
      { username, datecode, tasks: JSON.stringify(tasks) }
    )

    $.post(AJAXSettings)
      .fail((jqXHR, textStatus) => {
        if (jqXHR.status === 401 || jqXHR.status === 403) {
          resolve({ unauthorized: true })
        } else {
          reject(new Error(`Failed to update completed tasks data (${jqXHR.status})`))
        }
      })
  })
}

async function getCategories () {
  return new Promise((resolve, reject) => {
    // Build the ajax settings
    let AJAXSettings = makeAJAXSettings(
      '/data/categories/',
      (data) => { resolve(data) }
    )

    // Get the task category data and build the task matrix from it
    $.get(AJAXSettings)
      .fail((jqXHR, textStatus) => {
        if (jqXHR.status === 401 || jqXHR.status === 403) {
          resolve({ unauthorized: true })
        } else {
          reject(new Error(`Failed to retrieve task data (${jqXHR.status})`))
        }
      })
  })
}

export function hideTaskList () {
  return new Promise((resolve, reject) => {
    if ($('#category-list').css('display') !== 'none') {
      $('#category-list').fadeOut(400, 'swing', () => { resolve() })
    } else {
      resolve()
    }
  })
}

export async function retrieveSchemaAndTasks (schemaCallback, username, datecode) {
  try {
    await hideTaskList()
    let categories = await getCategories()
    schemaCallback(categories)
    if (username) {
      let data = await getCompletedTasks(username, datecode)
      data.tasks.forEach((id) => { $(`#task${id}`)[0].toggle() })
    }
  } catch (err) {
    console.log(`Error: ${err}`)
  }
}

export async function syncCompletedTasks (username, datecode, tasks) {
  try {
    await updateCompletedTasks(username, datecode, tasks)
  } catch (err) {
    console.log(`Error: ${err}`)
  }
}
