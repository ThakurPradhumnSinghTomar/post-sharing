// Express setup
const express = require('express')
const app = express()

// Mongoose models
const userModel = require('./models/user')
const postModel = require('./models/post')

// Required modules
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const path = require('path')
const upload = require('./config/multerconfig')
// View engine setup
app.set('view engine', 'ejs')

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname,'public')))

//[upload image]
app.get('/profile/upload',function(req,res){
    res.render('profileupload')
})

app.post('/upload', isLoggedIn, upload.single('image'), async function (req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect('/profile');
});



// Home page route
app.get('/', function (req, res) {
    res.render('index')
})

// User registration route
app.post('/register', async function (req, res) {
    let { email, password, username, name, age } = req.body

    // Check if user already exists
    let user = await userModel.findOne({ email })
    if (user) return res.status(500).send("user already register")

    // Hash the password and create user
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                name,
                age,
                email,
                password: hash
            })

            // Generate JWT and set as cookie
            let token = jwt.sign({ email: email, userid: user._id }, "secret")
            res.cookie("token", token)
            res.render("login")
        })
    })
})

// Login page route
app.get('/login', function (req, res) {
    res.render('login')
})

// Login POST route
app.post('/login', async function (req, res) {
    let { email, password } = req.body

    // Find user in database
    let user = await userModel.findOne({ email })
    if (!user) return res.status(500).send("something went wrong")

    // Compare passwords
    bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "secret")
            res.cookie("token", token)
            res.status(200).redirect('/profile')
        } else {
            res.redirect('/login')
        }
    })
})

// Logout route
app.get('/logout', function (req, res) {
    res.cookie('token', "")
    res.redirect("/login")
})

// Profile page (only for logged-in users)
app.get('/profile', isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.user.email }).populate('posts')
    res.render("profile", { user })
})

// Create new post
app.post('/post', isLoggedIn, async function (req, res) {
    let user = await userModel.findOne({ email: req.user.email })
    let { content } = req.body
    let post = await postModel.create({
        user: user._id,
        content
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')
})

//create route for like the post
app.get('/like/:id', isLoggedIn, async function (req, res) {
    let post = await postModel.findOne({_id: req.params.id }).populate('user')
    
    if(post.likes.indexOf(req.user.userid)==-1){
        post.likes.push(req.user.userid)
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1)
    }
    await post.save()
    res.redirect('/profile')
})

// Middleware to check login (JWT verification)
function isLoggedIn(req, res, next) {
    if (req.cookies.token == "") return res.redirect("/login")

    let data = jwt.verify(req.cookies.token, "secret")
    req.user = data
    next()
}

// Start server
app.listen(3000,()=>{
    console.log("Server start running on port : ")
})
