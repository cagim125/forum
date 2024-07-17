const router = require('express').Router()
let connectDB = require('./../database')
let db
connectDB.then((client)=>{
  console.log('Post : DB연결성공')
  db = client.db('forum')
}).catch((err)=> {
  console.log(err)
})

// S3 Image upload Start
const { S3Client } = require('@aws-sdk/client-s3')
const { ObjectId } = require('mongodb')
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


router.get('/write', (req, res) => {
  res.render('write.ejs')
})
router.post('/add', (req, res) => {
  console.log('글쓰기 시작')
  console.log(req.user)
  if (req.user == null) {
    res.send('로그인 해주세요.')
  }
  upload.single('image')(req, res, (err)=>{
    console.log(req.file)
    if (err) console.log(err)
    // 이미지 업로드성공시 실행할 코드~~
    // console.log(req.body)
    if (req.body.title == '') {
      res.send('제목안적었는데요.')
    } else {
      try {
         db.collection('post').insertOne(
          { 
            title: req.body.title, 
            content: req.body.content,
            image : req.file.location,
            user : req.user._id,
            username : req.user.username,
            like: 0
          }
        )
            res.redirect('/list')
      } catch (e) {
        console.log(e)
        res.send('DB에러남')
      }
    }
  })
})

router.delete('/delete', async (req, res) => {
  console.log(req.query.docid)
  if (req.user == null){
    return res.status(403).send('로그인안함')
  }
  let result = await db.collection('post').deleteOne({ 
    _id: new ObjectId(req.query.docid),
    user : req.user._id
   })
  console.log(result.deletedCount)
  if (result.deletedCount === 1) {
    console.log("문서가 성공적으로 삭제되었습니다.");
    return res.status(200).send('success')
  } else {
    console.log("문서를 찾을 수 없거나 삭제되지 않았습니다.");
    return res.status(400).send('Notfound')
  }
})

router.get('/detail/:id', async (req, res) => {
  const id = req.params.id;
  // console.log(`Received ID : ${id}`);

  if (!ObjectId.isValid(id)) {
    console.error(`Invalid ID Format ${id}`);
    return res.status(400).send('Invalid ID format');
  }

  try {
    let result = await db.collection('post').findOne(
      { 
        _id: new ObjectId(id)
      })
    let result2 = await db.collection('comments').find(
      { 
        parentId : new ObjectId(id)
      }).toArray()

    if (result == null){
      return res.status(400).send('그런 글 업슴')
    }
    if (result2 == null){
      return res.render('detail.ejs', { result : result, result2 : null })
    }
    res.render('detail.ejs', { result: result, result2: result2 })
  } catch (err) {
    res.send('해당 아이템은 업서요')
  }
})

router.get('/edit/:id', async (req, res) => {
  const id = req.params.id
  const user = req.user

  if( req.user == null) {
    return res.status(403).send('로그인안함')
  }
  if (!ObjectId.isValid(id)) {
    console.error(`Invalid ID Format ${id}`);
    return res.status(400).send('Invalid ID format');
  }
  try {
    let result = await db.collection('post').findOne(
      { 
      _id: new ObjectId(id),
      // user : req.user._id  
      }
    )
    res.render('edit.ejs', { result : result, user : user })
  } catch (err) {
    res.send('그런 아이템 업씀')
  }
})

router.put('/edit', async (req, res) => {
  const id = req.body.id

  if (req.body.title == '') {
    res.status(400).send('제목 공백 입니다.')
  }
  if (req.body.content == '') {
    res.status(400).send('내용 공백 입니다.')
  }
  if (!ObjectId.isValid(id)) {
    console.error(`Invalid ID Format ${id}`);
    return res.status(400).send('Invalid ID format');
  }

  try {
    await db.collection('post').updateOne({ _id: new ObjectId(id) },
      { $set: { title: req.body.title, content: req.body.content } })
    res.redirect('/post/detail/' + id)
  } catch (err) {
    res.status(500).send(err)
  }
})


module.exports = router