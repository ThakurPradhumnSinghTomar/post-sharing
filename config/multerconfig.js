const crypto = require('crypto') // for image unique names
const path = require('path') // use for image extenction like jpg,jpeg etc
const multer = require('multer')

//disk Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/image/upload')
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12, function (err, bytes) {
            const fn = bytes.toString('hex') + path.extname(file.originalname)
            cb(null, fn)
        })

    }
})
// Create multer instance
const upload = multer({ storage: storage })

// Export upload
module.exports = upload