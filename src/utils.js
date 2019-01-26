/* global $ */

// General utility functions used in many locations

// Handy tool for reading and writing cookies
import Cookies from 'js-cookie'

// Global configuration options
import config from './config'

// Get the current day
export function today () {
  let d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Get the epoch value for the current date without any time
export function toEpochSeconds (d) {
  return (d.valueOf() / 1000)
}

// Get the current hour in local time
export function currentHourLocal () {
  let d = new Date()
  return d.getHours()
}

export function makeAJAXSettings (URL, successCallback, payloadData, responseDataType = 'json') {
  // Build basic settings object
  let settings = {
    url: URL,
    success: successCallback,
    dataType: responseDataType
  }

  // Add data if provided
  if (payloadData) { settings.data = payloadData }

  // Add the JSON Web Token if it exists
  let JWT = Cookies.get(config.cookieName)
  if (JWT) {
    settings.headers = {
      Authorization: `Bearer ${JWT}`
    }
  }

  // Return settings object
  return settings
}

export function makeSpinner () {
  let spinner = $('<div/>').addClass('lds-spinner')
  for (let i = 0; i < 12; i++) {
    spinner.append($('<div/>'))
  }
  return spinner
}
