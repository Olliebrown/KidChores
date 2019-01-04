// General utility functions used in many locations

// Import jQuery as the usual '$' variable
import $ from 'jquery'

// Import configuration info and utility functions
import { makeAJAXSettings } from './utils'

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

export async function retrieveCategorySchema (callback) {
  try {
    let categories = await getCategories()
    callback(categories)
  } catch (err) {
    console.log(`Error: ${err}`)
  }
}
