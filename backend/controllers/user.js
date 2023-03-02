import User from '../models/userModel.js'
import ErrorResponse from '../utils/errorResponse.js'
import sendEmail from '../utils/sendEmail.js'
import crypto from 'crypto'
import asyncHandler from 'express-async-handler'
import generateToken from '../utils/generateToken.js'
import Order from '../models/orderModel.js'

export const register = async (req, res, next) => {
  const { username, email, password } = req.body

  const usernameExist = await User.findOne({ username })
  if (usernameExist) {
    res.status(409).json({ message: 'Username already exist' })
  }

  const emailExist = await User.findOne({ email })
  if (emailExist) {
    res.status(409).json({ message: 'Email already exist' })
  }
  if (!usernameExist && !emailExist) {
    try {
      const user = await User.create({
        username: username,
        email: email,
        password,
      })

      res.status(201).json({
        success: true,
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      })
    } catch (error) {
      return next(
        res
          .status(400)
          .json({ message: 'Enter a password of at least 8 characters' })
      )
    }
  }
}

export const login = async (req, res, next) => {
  const { username, password } = req.body

  if (!username || !password) {
    return next(new ErrorResponse('Please provide username and password', 400))
  }

  try {
    const user = await User.findOne({ username }).select('+password')

    if (!user) {
      return next(new ErrorResponse('Username not found', 404))
    }

    const isMatch = await user.matchPassword(password)

    if (!isMatch) {
      return next(new ErrorResponse('Password invalid', 401))
    }
    if (user && isMatch) {
      res.status(200).json({
        success: true,
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
export const deleteUsers = asyncHandler(async (req, res, next) => {
  const users = await User.findById(req.params.id)

  if (users) {
    await users.remove()
    res.json({ message: 'User removed' })
  } else {
    res.status(404)
    return next(new ErrorResponse('User not Found'))
  }
})

export const getUserById = asyncHandler(async (req, res, next) => {
  const users = await User.findById(req.params.id).select('-password')

  if (users) {
    res.json(users)
  } else {
    res.status(404)
    return next(new ErrorResponse('User not Found'))
  }
})

export const updateUserProfile = async (req, res, next) => {
  const user = await User.findById(req.user._id)

  if (user) {
    user.username = req.body.username || user.username
    user.email = req.body.email || user.email
    if (req.body.password) {
      user.password = req.body.password
    }
    const updateUser = await user.save()

    res.status(201).json({
      success: true,
      _id: updateUser._id,
      username: updateUser.username,
      email: updateUser.email,
      isAdmin: updateUser.isAdmin,
      token: generateToken(updateUser._id),
    })
  } else {
    return next(new ErrorResponse('User not found', 404))
  }
}

export const updateUser = async (req, res, next) => {
  const user = await User.findById(req.params.id)

  if (user) {
    user.username = req.body.username || user.username
    user.email = req.body.email || user.email
    user.isAdmin = req.body.isAdmin || user.isAdmin
    const updateUser = await user.save()

    res.status(201).json({
      success: true,
      _id: updateUser._id,
      username: updateUser.username,
      email: updateUser.email,
      isAdmin: updateUser.isAdmin,
    })
  }
}

export const getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({})
  res.json(users)
})

export const getUserProfile = async (req, res, next) => {
  const user = await User.findById(req.user._id)

  if (user) {
    res.status(201).json({
      success: true,
      _id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
    })
  } else {
    res.status(404)
    return next(new ErrorResponse('User not found'))
  }
}
export const forgotpassword = async (req, res, next) => {
  const { email } = req.body

  try {
    const user = await User.findOne({ email })

    if (!user) {
      return next(new ErrorResponse('Email could not be sent', 404))
    }

    const resetToken = user.getResetPasswordToken()

    await user.save()

    const resetUrl = `http://localhost:3000/passwordreset/${resetToken}`

    const message = `
    <h1>You have requested a password reset</h1>
    <p>Please go to this  link  to reset  your password</p>
    <a href=${resetUrl} clicktacking=off>${resetUrl}</a>
    `
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        text: message,
      })

      res.status(200).json({ success: true, data: 'Email sent' })
    } catch (error) {
      user.resetPasswordToken = undefined
      user.resetPasswordExpire = undefined

      await user.save()

      return next(new ErrorResponse('Email could not be send', 500))
    }
  } catch (error) {
    next(error)
  }
}

export const resetpassword = async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex')

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    })

    if (!user) {
      return next(new ErrorResponse('Invalid Reset Token', 400))
    }

    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save()

    res.status(201).json({
      success: true,
      data: 'Password reset success',
    })
  } catch (error) {
    next(error)
  }
}

/* user Order */

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
  res.json(orders)
})

// @desc    Create new order
// @route   POST /api/private/orders
// @access  Private
export const addOrderItems = asyncHandler(async (req, res, next) => {
  const {
    orderItems,
    shippingProcess,
    paymentMethod,
    itemPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body

  if (orderItems && orderItems.length === 0) {
    res.status(400)
    throw new Error('No order Items')
  } else {
    const order = new Order({
      orderItems,
      user: req.user._id,
      shippingProcess,
      paymentMethod,
      itemPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    })

    const createOrder = await order.save()

    res.status(201).json(createOrder)
  }
})
// @desc    Get order by ID
// @route   GET /api/private/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  )

  if (order) {
    res.json(order)
  } else {
    res.status(404)
    return next(new ErrorResponse('Order not found'))
  }
})

// @desc    Update order to paid
// @route   PUT /api/private/orders/:id/pay
// @access  Private
export const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)

  if (order) {
    order.isPaid = true
    order.paidAt = Date.now()
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.payer.email_address,
    }

    const updatedOrder = await order.save()

    res.json(updatedOrder)
  } else {
    res.status(404)
    return next(ErrorResponse('Order not found'))
  }
})

// @desc    Get all orders
// @route   GET /api/private/orders
// @access  Private/Admin
export const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'id name')
  res.json(orders)
})

// @desc    Update order to delivered
// @route   GET /api/private/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)

  if (order) {
    order.isProcess = true
    order.processAt = Date.now()

    const updatedOrder = await order.save()

    res.json(updatedOrder)
  } else {
    res.status(404)
    return next(ErrorResponse('Order not found'))
  }
})

// @desc    Update order to delivered
// @route   GET /api/private/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToSuccess = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)

  if (order) {
    order.statusProcess = true
    order.processAt = Date.now()

    const updatedOrder = await order.save()

    res.json(updatedOrder)
  } else {
    res.status(404)
    return next(ErrorResponse('Order not found'))
  }
})
