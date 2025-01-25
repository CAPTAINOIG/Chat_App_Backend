const express = require ('express')
const router = express.Router()

const {registerUser, userLogin, getDashboard, fetchMessage, deleteMessage, forwardedMessage, handlePinMessage, fetchPinMessage, handleUnpinMessage, profilePicture, fetchProfilePicture} = require('../controllers/user.controller')

router.post('/signup', registerUser)
router.post('/signin', userLogin)
router.post('/messages/forward', forwardedMessage)
router.post('/pinMessage', handlePinMessage)
router.post('/unpinMessage', handleUnpinMessage)
router.post('/profilePicture', profilePicture)

router.get('/dashboard', getDashboard)
router.get('/getMessage', fetchMessage)
router.get('/getPinMessage', fetchPinMessage)
router.get('/fetchPicture', fetchProfilePicture)

router.delete('/deleteMessage/:messageId', deleteMessage)








module.exports = router