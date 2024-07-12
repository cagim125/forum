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



// router.get('/list/:id', async (req, res) => {
  // let result = await db.collection('post').find()
  // .skip( (req.params.id -1) * 5).limit(5).toArray()
  //   res.render('list.ejs', { 글목록: result })
// })

router.get('/write', (req, res) => {
  res.render('write.ejs')
})
router.post('/add', (req, res) => {
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
          { title: req.body.title, 
            content: req.body.content,
            image : req.file.location,
            like: 0 })
            res.redirect('/list')
      } catch (e) {
        console.log(e)
        res.send('DB에러남')
      }
    }
  })
})



module.exports = router