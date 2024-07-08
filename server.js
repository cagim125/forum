const express = require('express')
const app = express()

const methodOverride = require('method-override')

const { MongoClient, ObjectId } = require('mongodb');

let db
const url = "mongodb+srv://cagim30:!share2011!@cluster0.qzbj3dh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"



new MongoClient(url).connect().then((client) => {
  console.log('DB연결성공')
  db = client.db('forum')

  app.listen(8080, () => {
    console.log('http;//localhost:8080 에서 서버 실행중')
  })
}).catch((err) => {
  console.log(err)
})

app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(methodOverride('_method'))

app.get('/detail/:id', async (req, res) => {
  const id = req.params.id;

  console.log(`Received ID : ${id}`);

  if (!ObjectId.isValid(id)) {
    console.error(`Invalid ID Format ${id}`);
    return res.status(400).send('Invalid ID format');
  }

  try {
    let result = await db.collection('post').findOne({ _id: new ObjectId(id) })
    if (result == null) {
      res.status(400).send('그런 글 업슴')
    }
    res.render('detail.ejs', { result: result })
  } catch (err) {
    res.send('해당 아이템은 업서요')
  }
})

app.get('/edit/:id', async (req, res) => {
  const id = req.params.id

  if (!ObjectId.isValid(id)) {
    console.error(`Invalid ID Format ${id}`);
    return res.status(400).send('Invalid ID format');
  }
  try {
    let result = await db.collection('post').findOne({ _id: new ObjectId(id) })
    console.log(JSON.stringify(result))

    res.render('edit.ejs', { result, result })
  } catch (err) {
    res.send('그런 아이템 업씀')
  }
})
app.put('/edit', async (req, res) => {
  console.log(req.body.title)
  if (req.body.title == '') {
    res.status(400).send('제목 공백 입니다.')
  }
  if (req.body.content == '') {
    res.status(400).send('내용 공백 입니다.')
  }

  try {
    await db.collection('post').updateOne({ _id: new ObjectId(req.body.id) },
      { $set: { title: req.body.title, content: req.body.content } })
    res.redirect('/list')
  } catch (err) {
    res.status(500).send(err)
  }
})
app.post('/add', async (요청, 응답) => {
  console.log(요청.body)
  if (요청.body.title == '') {
    응답.send('제목안적었는데요.')
  } else {
    try {
      await db.collection('post').insertOne({ title: 요청.body.title, content: 요청.body.content, like: 0 })
      응답.redirect('/list')
    } catch (e) {
      console.log(e)
      응답.send('DB에러남')
    }

  }
})
app.delete('/delete', async (req, res) => {
  console.log(req.query.docid)
  let result = await db.collection('post').deleteOne( { _id : new ObjectId(req.query.docid) })
  console.log(result.deletedCount)
  if (result.deletedCount === 1) {
    console.log("문서가 성공적으로 삭제되었습니다.");
    return res.status(200).send('success')
  } else {
    console.log("문서를 찾을 수 없거나 삭제되지 않았습니다.");
    return res.status(400).send('Notfound')
  }
})



app.get('/', (요청, 응답) => {
  응답.sendFile(__dirname + '/index.html')
})

app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().toArray()
  res.render('list.ejs', { 글목록: result })
})
app.get('/list/:id', async (req, res) => {
  let Page = await db.collection('post').find().toArray()
  let totalPage = Page.length
  let result = await db.collection('post').find()
  .skip( (req.params.id - 1) * 5).limit(5).toArray()
  res.render('list.ejs', { 글목록: result, totalPage : totalPage })
})



app.get('/write', (req, res) => {
  res.render('write.ejs')
})




app.get('/time', (req, res) => {
  res.render('time.ejs', { data: new Date() })
})

app.get('/about', (요청, 응답) => {
  console.log(db.collection('post').findOne({ title: '어쩌구' }))

  응답.sendFile(__dirname + '/about.html')
})

app.get('/news', (요청, 응답) => {
  db.collection('post').insertOne({ title: '어쩌구' })
  응답.send('내일 비 안옴')
})

app.get('/shop', (요청, 응답) => {
  응답.send('쇼핑페이지입니다~')
})