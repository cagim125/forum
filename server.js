const express = require('express')
const app = express()
const { MongoClient } = require('mongodb');
let db
const url = "mongodb+srv://cagim30:!share2011!@cluster0.qzbj3dh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')

  app.listen(8080, () => {
    console.log('http;//localhost:8080 에서 서버 실행중')
  })
}).catch((err)=>{
  console.log(err)
})

app.set('view engine', 'ejs') 
app.use(express.static(__dirname + '/public'))



app.get('/', (요청, 응답) => {
  응답.sendFile(__dirname + '/index.html')
})

app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().toArray()
  res.render('list.ejs', { 글목록 : result})
})

app.get('/time', (req, res) => {
  res.render('time.ejs', { data : new Date()})
})

app.get('/about', (요청,응답) => {
  console.log(db.collection('post').findOne({title: '어쩌구'}))

  응답.sendFile(__dirname + '/about.html')
})

app.get('/news', (요청,응답) => {
  db.collection('post').insertOne({title : '어쩌구'})
  응답.send('내일 비 안옴')
})

app.get('/shop', (요청,응답) => {
  응답.send('쇼핑페이지입니다~')
})