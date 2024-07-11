require('dotenv').config()

const { MongoClient } = require('mongodb')
const url = process.env.Mongo_url
let connectDB = new MongoClient(url).connect()

module.exports = connectDB 