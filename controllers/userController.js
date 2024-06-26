import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { v4 as uuidv4 } from 'uuid';
import { sendForgotPasswordMail } from '../utils/sendForgotPasswordMail.js';

// @desc    Register
// @route   POST /user/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const userName = email.split('@');

  const user = await User.create({
    firstName,
    lastName,
    userName: userName?.[0],
    email,
    password,
  });

  if (user) {
    //Jwt cookie
    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userName: user.userName,
      isEmailVerified: user.isEmailVerified,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login & get token
// @route   POST /user/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { userName, password } = req.body;

  const user = await User.findOne({ userName });

  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userName: user.userName,
      isEmailVerified: user.isEmailVerified,
    });
  } else {
    res.status(401);
    throw new Error('Invalid username or password');
  }
});

// @desc    Logout user and clear cookie
// @route   POST /user/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('jwt');
  res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    temporary password for user
// @route   GET /user/:token
// @access  Public
const tempPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ tempPassword: token });

  if (user) {
    res.json({
      message:
        'The generated password is valid, you can set your new password.',
    });
  } else {
    res.status(404);
    throw new Error(
      'Enter the entered temporary password is incorrect, try again'
    );
  }
});

// @desc    new password for user
// @route   PUT /user/new-password
// @access  Public
const newPassword = asyncHandler(async (req, res) => {
  const { tempToken, password } = req.body;

  const user = await User.findOne({ tempPassword: tempToken });

  if (user) {
    user.tempPassword = '';
    user.password = password;

    await user.save();

    generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      userName: user.userName,
      isEmailVerified: user.isEmailVerified,
    });
  } else {
    res.status(404);
    throw new Error('Please go to forgot password page, try again');
  }
});

// @desc    new password for user
// @route   PUT /user/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (user) {
    const name = `${user.firstName}  ${user.lastName}`;
    const email = user.email;
    const tempToken = uuidv4();

    user.tempPassword = tempToken;

    await user.save();

    sendForgotPasswordMail(name, email, tempToken);

    res.json({
      message: 'Reset password link has been sent to your mail',
    });
  } else {
    res.status(404);
    throw new Error('User not Found');
  }
});

export {
  registerUser,
  loginUser,
  newPassword,
  forgotPassword,
  logoutUser,
  tempPassword,
};
