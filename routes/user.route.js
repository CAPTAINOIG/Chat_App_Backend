const express = require ('express')
const router = express.Router()

const {registerUser, userLogin, getDashboard, getAllUser, fetchMessage} = require('../controllers/user.controller');

router.post('/signup', registerUser)
router.post('/signin', userLogin)
// router.post('/send', createMessage)




router.get('/dashboard', getDashboard)
router.get('/getMessage', fetchMessage)








module.exports = router