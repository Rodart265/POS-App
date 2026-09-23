const { initializeApp } = require('firebase-admin/app')
initializeApp()

exports.setUserRole = require('./setUserRole').setUserRole

// Phase B: PayChangu webhook handler goes here, e.g.
// exports.paychanguWebhook = require('./paychanguWebhook').paychanguWebhook
