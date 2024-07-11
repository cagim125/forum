require('dotenv').config()

const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const router = express.Router()
const app = express()

// 메소드 자동 변환
const methodOverride = require('method-override')
// 비밀번호 해쉬
const bcrypt = require('bcrypt')
// 몽고DB import
const connectDB = require('./database')
const { ObjectId } = require('mongodb')
const MongoStore = require('connect-mongo')

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// S3 Image upload Start
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
    accessKeyId : process.env.accessKeyId, 
    secretAccessKey : process.env.secretAccessKey
  }
})
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'my-web-bucket2024',
    key: function (req, file, cb) {
      cb(null, Math.floor(Math.random() * 1000).toString() + Date.now() + '.' + file.originalname.split('.').pop()) //업로드시 파일명 변경가능
    }
  })
})
// S3 Image upload End


let db
connectDB.then((client) => {
  console.log('DB연결성공')
  db = client.db('forum')
  app.listen(process.env.PORT, () => {
    console.log( process.env.SERVER_URL + ':' + process.env.PORT + ' 에서 서버 실행중')
  })
}).catch((err) => {
  console.log(err)
})

app.set('view engine', 'ejs')
//정적 파일 import
app.use(express.static(__dirname + '/public'))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(methodOverride('_method'))

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

app.use(passport.initialize())
app.use(session({
  secret: 'P@ssW0rd123456',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 },
  store: MongoStore.create({
    mongoUrl: process.env.Mongo_url,
    dbName: 'forum',
  })
}))

app.use(passport.session())

passport.use(new LocalStrategy(async (username, password, cb) => {
  let result = await db.collection('user').findOne({ username: username })
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
  }
  if (await bcrypt.compare(password, result.password)) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' })
  }
}))
passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username })
  })
})
passport.deserializeUser(async (user, done) => {
  let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) })
  delete result.password
  process.nextTick(() => {
    return done(null, result)
  })
})
function checkLogin(req, res, next) {
  // console.log("user " + req.user)
  if (req.user) {
    next()
  } else {
    res.send('로그인안했는데?')
  }
}
//router 
app.use('/shop', checkLogin, require('./routes/shop'))
app.use('/board/sub', checkLogin ,require('./routes/board'))



app.post('/add', (req, 응답) => {
  upload.single('image')(요청, 응답, (err)=>{
    if (err) return 응답.send('에러남')
    // 이미지 업로드성공시 실행할 코드~~
    // console.log(req.body)
    if (req.body.title == '') {
      응답.send('제목안적었는데요.')
    } else {
      try {
         db.collection('post').insertOne(
          { title: req.body.title, 
            content: req.body.content,
            image : req.file.location,
            like: 0 })
        응답.redirect('/list')
      } catch (e) {
        console.log(e)
        응답.send('DB에러남')
      }
    }
  })


})


app.get('/test2', checkLogin, (req, res) => { 
  res.send('로그인 확인')
})

function validateID(req, res, next) {
  if (req.body.usernmae == '' || req.body.password == '') {
    res.send('아이디 또는 비밀번호가 비어 있음')
  } else if (req.body.password.length < 8) {
    return res.send('비밀번호는 8자 이상 입력해 주세요.')
  } else {
    next()
  }
}


app.get('/register', (req, res) => {
  res.render('register.ejs')
})
app.post('/register', validateID, async (요청, 응답) => {
  let user = await db.collection('user').findOne({ username: 요청.body.username })
  if (user != null) {
    return 응답.status(400).send('이미 사용 중인 아이디 입니다.')
  }

  let hash = await bcrypt.hash(요청.body.password, 10)
  await db.collection('user').insertOne({
    username: 요청.body.username,
    password: hash
  })
  응답.redirect('/')
})
app.get('/login', (req, res) => {
  res.render('login.ejs')
})
app.post('/login', (req, res, next) => {

  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json(error)
    if (!user) return res.status(401).json(info.message)
    req.logIn(user, (err) => {
      if (err) return next(err)
      res.redirect('/')
    })
  })(req, res, next)
})

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

app.delete('/delete', async (req, res) => {
  console.log(req.query.docid)
  let result = await db.collection('post').deleteOne({ _id: new ObjectId(req.query.docid) })
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
  응답.redirect('/list')
})

//middleware 설정
app.use('/list', (req, res, next) => {
  console.log(new Date())
  next()
})

app.get('/list', async (req, res) => {
  // console.log(req.user)
  let result = await db.collection('post').find().toArray()
  let totalPage = result.length
  res.render('list.ejs', { 글목록: result, totalPage: totalPage })
})
app.get('/list/:id', async (req, res) => {
  let Page = await db.collection('post').find().toArray()
  let totalPage = Page.length
  let result = await db.collection('post').find()
    .skip((req.params.id - 1) * 5).limit(5).toArray()
  res.render('list.ejs', { 글목록: result, totalPage: totalPage })
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