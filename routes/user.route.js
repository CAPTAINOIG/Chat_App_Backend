const express = require ('express')
const router = express.Router()

const {registerUser, userLogin, getDashboard, getAllUser, fetchMessage, deleteMessage} = require('../controllers/user.controller');

router.post('/signup', registerUser)
router.post('/signin', userLogin)


router.get('/dashboard', getDashboard)
router.get('/getMessage', fetchMessage)

router.delete('/deleteMessage/:id', deleteMessage)








module.exports = router