import express from 'express'
import { writeSync } from 'node:fs'
const status = express.response.status
express.response.status = function (code) {
  if (code === 501)
    writeSync(2, `MDT266 unexpected501 ${this.req.url} ${new Error().stack}\n`)
  return status.call(this, code)
}
