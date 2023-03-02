import express from 'express'
import { protect, admin } from '../middleware/auth.js'
import {
  register,
  login,
  forgotpassword,
  resetpassword,
  getUserProfile,
  updateUserProfile,
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  getUsers,
  deleteUsers,
  updateUser,
  getUserById,
  getOrders,
  updateOrderToDelivered,
  updateOrderToSuccess,
} from '../controllers/user.js'
const router = express.Router()

router.route('/register').post(register)
router.route('/login').post(login)
router.route('/forgotpassword').post(forgotpassword)
router.route('/resetpassword/:resetToken').put(resetpassword)

router.route('/all-user').get(protect, admin, getUsers)
router
  .route('/user/:id')
  .delete(protect, admin, deleteUsers)
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
router.route('/myorders').get(protect, getMyOrders)
router
  .route('/orders')
  .post(protect, addOrderItems)
  .get(protect, admin, getOrders)
router.route('/order/:id').get(protect, getOrderById)
router.route('/order/:id/pay').put(protect, updateOrderToPaid)
router.route('/:id').get(protect, getUserProfile)
router.route('/order/:id/deliver').put(protect, admin, updateOrderToDelivered)
router.route('/order/:id/success').put(protect, admin, updateOrderToSuccess)
router.route('/profile').put(protect, updateUserProfile)

export default router
