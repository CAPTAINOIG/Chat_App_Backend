const express = require ('express')
const router = express.Router()

const {registerUser, userLogin, getDashboard, googleAuth, fetchMessage, deleteMessage, forwardedMessage, handlePinMessage, fetchPinMessage, handleUnpinMessage, profilePicture, fetchProfilePicture, updateProfile, getUpdateProfile} = require('../controllers/user.controller')

router.post('/signup', registerUser)
router.post('/signin', userLogin)
router.post('/messages/forward', forwardedMessage)
router.post('/pinMessage', handlePinMessage)
router.post('/unpinMessage', handleUnpinMessage)
router.post('/googleAuth', googleAuth)
router.post('/profilePicture', profilePicture)
router.put('/updateProfile/:userId', updateProfile)

router.get('/dashboard', getDashboard)
router.get('/getMessage', fetchMessage)
router.get('/getPinMessage', fetchPinMessage)
router.get('/fetchPicture', fetchProfilePicture)
router.get('/getUpdateProfile', getUpdateProfile)

router.delete('/deleteMessage/:messageId', deleteMessage)








module.exports = router