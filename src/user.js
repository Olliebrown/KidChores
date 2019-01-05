/* global __DEV__ */

// Functions designed for client aside user account management

// Import jQuery as the usual '$' variable
import $ from 'jquery'

// Handy tool for reading and writing cookies
import Cookies from 'js-cookie'

// Import configuration info and utility functions
import config from './config'
import { makeAJAXSettings } from './utils'

// Simple check of the authorization token (if found)
function checkToken () {
  return new Promise((resolve, reject) => {
    let token = Cookies.get(config.cookieName)
    if (!token) {
      reject(new Error('no token'))
    } else {
      let AJAXSettings = makeAJAXSettings(
        `/data/authorize/`,
        (result) => {
          resolve(result)
        },
        { token }
      )

      // Make the AJAX POST request
      $.post(AJAXSettings)
    }
  })
}

// Validate a username and password for authentication
function validateUser (username, password) {
  return new Promise((resolve, reject) => {
    // Do not proceed if not using a secure protocol
    // (we are about to send a password!!)
    if (!__DEV__ && window.location.protocol !== 'https:') {
      reject(new Error('Must use secure protocol to log in'))
    }

    // Build the POST request settings
    let AJAXSettings = makeAJAXSettings(
      `/data/authorize/`,
      (result) => {
        if (!result.success) {
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
function queryUsername (username) {
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
function addUser (firstName, lastName, username, usertype, password) {
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
      { firstName, lastName, username, usertype, password }
    )

    $.post(AJAXSettings)
  })
}

// Function that runs when the new user form is submitted
export async function makeNewUser () {
  // Check user name availability
  try {
    let username = $('#inputNewUserName').val()
    await queryUsername(username)

    // Get other info, hash the password, and send to server
    let firstName = $('#inputFirstName').val()
    let lastName = $('#inputLastName').val()
    let usertype = $("input[name='usertype']:checked").val() || 'child'
    let password = $('#inputNewPassword').val()
    await addUser(firstName, lastName, username, usertype, password)

    // Signal success and hide the modal
    alert('New user successfully created')
    $('#newUserModel').modal('hide')
  } catch (err) {
    alert(`${err}`)
  }
}

// Function that runs when the login form is submitted
export async function loginExistingUser () {
  // Check user name availability
  try {
    // Grab username and hash the password
    let username = $('#inputUserName').val()
    let password = $('#inputPassword').val()

    // Submit to server for verification
    let result = await validateUser(username, password)

    // Save the authorization token if included
    if (result.token) {
      Cookies.set(config.cookieName, result.token, { expires: 7 })
    }

    // Update with given user info and hide the modal
    updateUserState(result)
    $('#loginModal').modal('hide')
    return result
  } catch (err) {
    alert(`${err}`)
  }
}

export async function checkAndDecodeToken () {
  try {
    let decoded = await checkToken()
    return decoded
  } catch (err) {
    return undefined
  }
}

export function logoutUser () {
  console.log('removing cookie')
  Cookies.remove(config.cookieName)
}

export function updateUserState (userInfo) {
  console.log('updating user info')
  if (userInfo) {
    $('#navLogin').attr('hidden', '')
    $('#navUsername').removeAttr('hidden')
    $('#navUsernameText').html(`Hello ${userInfo.firstname} &nbsp;&nbsp;|`)
    $('#navLogout').removeAttr('hidden')
    if (userInfo.usertype === 'parent') {
      $('#navNewUser').removeAttr('hidden')
    } else {
      $('#navNewUser').attr('hidden', '')
    }
  } else {
    $('#navLogin').removeAttr('hidden')
    $('#navUsername').attr('hidden', '')
    $('#navNewUser').attr('hidden', '')
    $('#navLogout').attr('hidden', '')
  }
}
