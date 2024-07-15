require('dotenv').config()

const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
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



let db
connectDB.then((client) => {
  console.log('DB연결성공')
  db = client.db('forum')
  app.listen(process.env.PORT, () => {
    console.log(process.env.SERVER_URL + ':' + process.env.PORT + ' 에서 서버 실행중')
  })
}).catch((err) => {
  console.log(err)
})

// 템플릿 엔진
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
  if (req.user) {
    next()
  } else {
    res.send('로그인안했는데?')
  }
}
function validateID(req, res, next) {
  if (req.body.usernmae == '' || req.body.password == '') {
    res.send('아이디 또는 비밀번호가 비어 있음')
  } else if (req.body.password.length < 8) {
    return res.send('비밀번호는 8자 이상 입력해 주세요.')
  } else {
    next()
  }
}

app.use((req, res, next) => {
  // `req.user`가 존재하면 `res.locals.user`에 설정
  res.locals.user = req.user || null;
  next();
});

//router 
app.use('/shop', checkLogin, require('./routes/shop'))
app.use('/board', checkLogin , require('./routes/board'))
app.use('/post', checkLogin ,  require('./routes/post'))



// 회원가입
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
// 회원가입 끝

// 로그인
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
// 로그인 끝


app.get('/', (요청, 응답) => {
  응답.redirect('/list')
})
app.get('/list' , async (req, res) => {
  if( req.user != null) {
     var user = req.user
  }
  let result = await db.collection('post').find().toArray()
  res.render('list.ejs', { 글목록: result, user: user })
})


app.get('/search', async (req, res) => {
  let 검색조건 = [
    {
      $search: {
        index: 'title_index',
        text: { query: req.query.val, path: 'title' }
      }
    },
    { $sort: { _id: 1 } },
    { $skip: 0 },
    { $limit: 3 },
    // { $project : 0}
  ]
  let result = await db.collection('post').aggregate(검색조건).toArray()
  // let result = await db.collection('post')
  // .find({ $text : { $search : req.query.val }}  ).toArray()
  console.log(result)
  res.render('list.ejs', { 글목록: result })
})


// app.get('/list/next/:id', async (req, res) => {
//   try {
//     const id = req.params.id;
//     if (!ObjectId.isValid(id)) {
//       return res.status(400).send('Invalid ObjectId');
//     }
//     const objectId = new ObjectId(id); // ObjectId 생성자를 사용할 때 문자열을 전달
//     let result = await db.collection('post').find({ _id: { $gt: objectId } }).limit(5).toArray();
//     if (result == '') {
//       res.send('마지막 페이지 입니다.')
//     }
//     res.render('list.ejs', { 글목록: result });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Internal Server Error');
//   }
// })
// app.get('/list/prev/:id', async (req, res) => {
//   try {
//     const id = req.params.id;
//     if (!ObjectId.isValid(id)) {
//       return res.status(400).send('Invalid ObjectId');
//     }
//     const objectId = new ObjectId(id); // ObjectId 생성자를 사용할 때 문자열을 전달
//     let result = await db.collection('post').find({ _id: { $lt: objectId } }).sort({ _id: -1 }).limit(5).toArray();
//     if (result == '') {
//       result = await db.collection('post').find({ _id: objectId }).limit(5).toArray();
//     }
//     res.render('list.ejs', { 글목록: result });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Internal Server Error');
//   }
// })

//middleware 설정
// app.use('/list', (req, res, next) => {
//   console.log(new Date())
//   next()
// })

app.get('/time', (req, res) => {
  res.render('time.ejs', { data: new Date() })
})

app.get('/about', (요청, 응답) => {
  console.log(db.collection('post').findOne({ title: '어쩌구' }))
  응답.sendFile(__dirname + '/about.html')
})


