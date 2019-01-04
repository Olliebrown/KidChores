// Functions designed for client aside user account management

// Import jQuery as the usual '$' variable
import $ from 'jquery'

// Handy tool for reading and writing cookies
import Cookies from 'js-cookie'

// Import bcrypt for hasing passwords
import bcrypt from 'bcryptjs'

// Import configuration info and utility functions
import config from './config'
import { makeAJAXSettings } from './utils'

// Validate a username and pwHash for authentication
async function validateUser (username, password) {
  return new Promise((resolve, reject) => {
    // Do not proceed if not using a secure protocol
    // (we are about to send a password!!)
    if (window.location.protocol !== 'https:') {
      reject(new Error('Must use secure protocol to log in'))
    }

    // Build the POST request settings
    let AJAXSettings = makeAJAXSettings(
      `/data/validateuser/`,
      (result) => {
        if (!result.isValid) {
          reject(new Error('Invalid user name or password'))
        } else {
          resolve(result)
        }
      },
      { username, password }
    )

    // Make the AJAX POST request
    $.post(AJAXSettings)
  })
}

// Query a username to see if it exists in the DB already
async function queryUsername (username) {
  return new Promise((resolve, reject) => {
    let AJAXSettings = makeAJAXSettings(
      `/data/checkuser/${username}`,
      (user) => {
        if (user.username) {
          reject(new Error('User name already exists'))
        } else {
          resolve()
        }
      }
    )
    $.get(AJAXSettings)
  })
}

// Add a user with the given username and passsword hash
async function addUser (firstName, lastName, username, pwHash) {
  return new Promise((resolve, reject) => {
    let AJAXSettings = makeAJAXSettings(
      '/data/newuser/',
      (response) => {
        if (response.error) {
          reject(new Error(`Failed to create user - ${response.error}`))
        } else {
          resolve()
        }
      },
      { firstName, lastName, username, pwHash }
    )

    $.post(AJAXSettings)
  })
}

// Function that runs when the new user form is submitted
export async function makeNewUser (event) {
  event.preventDefault()

  // Check user name availability
  try {
    let username = $('#inputNewUserName').val()
    await queryUsername(username)

    // Get other info, hash the password, and send to server
    let firstName = $('#inputFirstName').val()
    let lastName = $('#inputLastName').val()
    let hash = bcrypt.hashSync($('#inputNewPassword').val(), 10)
    await addUser(firstName, lastName, username, hash)
    alert('New user successfully created')
  } catch (err) {
    alert(`${err}`)
  }
}

// Function that runs when the login form is submitted
export async function loginExistingUser (event) {
  event.preventDefault()

  // Check user name availability
  try {
    // Grab username and hash the password
    let username = $('#inputUserName').val()
    let hash = bcrypt.hashSync($('#inputPassword').val(), 10)

    // Submit to server for verification
    let result = await validateUser(username, hash)

    // Save the authorization token if included
    if (result.JWT) {
      Cookies.set(config.cookieName, result.JWT)
    }
  } catch (err) {
    alert(`${err}`)
  }
}
