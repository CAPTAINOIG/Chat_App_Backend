const express = require ('express')
const router = express.Router()

const {registerUser, userLogin, getDashboard, fetchMessage, deleteMessage, forwardedMessage, handlePinMessage} = require('../controllers/user.controller')

router.post('/signup', registerUser)
router.post('/signin', userLogin)
router.post('/messages/forward', forwardedMessage)
router.post('/pinMessage', handlePinMessage)

router.get('/dashboard', getDashboard)
router.get('/getMessage', fetchMessage)
// router.get('/getAllUser', getAllUser)

router.delete('/deleteMessage/:id', deleteMessage)








module.exports = router