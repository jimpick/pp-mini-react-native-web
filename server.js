const budo = require('budo')
const express = require('express')
const expressWebSocket = require('express-ws')
const websocketStream = require('websocket-stream/stream')
const pump = require('pump')
const through2 = require('through2')
const ram = require('random-access-memory')
const toBuffer = require('to-buffer')
const hypercore = require('hypercore')
const aliasify = require('aliasify')
const sheetify = require('sheetify')
const babelify = require('babelify')
const reactify = require('reactify')
const brfs = require('brfs')
const Multicore = require('./multicore')

require('events').prototype._maxListeners = 100

const router = express.Router()

/*
app.use('/js', browserify(__dirname + '/script'))
app.use(express.static(__dirname + '/public'))
*/

const multicores = {}

function attachWebsocket (server) {
  console.log('Attaching websocket')
  expressWebSocket(router, server, {
    perMessageDeflate: false
  })

  router.ws('/archiver/:key', (ws, req) => {
    const archiverKey = req.params.key
    console.log('Websocket initiated for', archiverKey)
    let multicore
    if (multicores[archiverKey]) {
      multicore = multicores[archiverKey]
    } else {
      multicore = new Multicore(ram, {key: req.params.key})
      multicores[archiverKey] = multicore
      const ar = multicore.archiver
      ar.on('add', feed => {
        console.log('archive add', feed.key.toString('hex'), feed.length)
        multicore.replicateFeed(feed)
      })
      ar.on('sync', feed => {
        console.log('archive sync', feed.key.toString('hex'), feed.length)
      })
      ar.on('ready', () => {
        console.log('archive ready', ar.changes.length)
        ar.changes.on('append', () => {
          console.log('archive changes append', ar.changes.length)
        })
        ar.changes.on('sync', () => {
          console.log('archive changes sync', ar.changes.length)
        })
      })
    }
    const ar = multicore.archiver
    ar.ready(() => {
      const stream = websocketStream(ws)
      pump(
        stream,
        through2(function (chunk, enc, cb) {
          console.log('From web', chunk)
          this.push(chunk)
          cb()
        }),
        ar.replicate({encrypt: false}),
        through2(function (chunk, enc, cb) {
          console.log('To web', chunk)
          this.push(chunk)
          cb()
        }),
        stream,
        err => {
          console.log('pipe finished', err && err.message)
        }
      )
      multicore.replicateFeed(ar.changes)
    })

    // Join swarm
    const sw = multicore.joinSwarm()
    sw.on('connection', (peer, type) => {
      if (!peer.remoteUserData) {
        console.log('Connect - No user data')
        return
      }
      try {
        const userData = JSON.parse(peer.remoteUserData.toString())
        if (userData.key) {
          console.log(`Connect ${userData.name} ${userData.key}`)
          const dk = hypercore.discoveryKey(toBuffer(userData.key, 'hex'))
          multicore.archiver.add(dk)
          multicore.announceActor(userData.name, userData.key)
        }
      } catch (e) {
        console.log(`Connection with no or invalid user data`, e)
        // console.error('Error parsing JSON', e)
      }
    })
  })
}

const port = process.env.PORT || 5000
const devServer = budo('index.js', {
  port,
  browserify: {
    transform: [
      brfs,
      sheetify,
      [babelify, {presets: ["env", "react"]}],
      reactify,
      [aliasify, {
        aliases: {"react-native": "react-native-web"},
        verbose: true
      }]
    ]
  },
  middleware: [
    router
  ]
})
devServer.on('connect', event => {
  console.log('Listening on', event.uri)
  attachWebsocket(event.server)
})

