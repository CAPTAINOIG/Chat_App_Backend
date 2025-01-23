const express = require ('express')
const router = express.Router()

const {registerUser, userLogin, getDashboard, fetchMessage, deleteMessage, forwardedMessage, handlePinMessage, fetchPinMessage, handleUnpinMessage} = require('../controllers/user.controller')

router.post('/signup', registerUser)
router.post('/signin', userLogin)
router.post('/messages/forward', forwardedMessage)
router.post('/pinMessage', handlePinMessage)
router.post('/unpinMessage', handleUnpinMessage)

router.get('/dashboard', getDashboard)
router.get('/getMessage', fetchMessage)
router.get('/getPinMessage', fetchPinMessage)
// router.get('/getAllUser', getAllUser)

router.delete('/deleteMessage/:messageId', deleteMessage)








module.exports = router