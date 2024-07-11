const express = require('express')
const router = express.Router();

let connectDB = require('./../database')
let db
connectDB.then((client)=>{
  console.log('Shop : DB연결성공')
  db = client.db('forum')
}).catch((err)=> {
  console.log(err)
})

router.get('/shirts', (req, res) => {
  res.send('셔츠 파는 페이지입니다')
})

router.get('/pants', (req, res) => {
  res.send('바지 파는 페이지입니다')
})

module.exports = router