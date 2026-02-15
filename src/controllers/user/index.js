// Profile management
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
} from "./profile.js";

// Address management
import {
  getUserAddresses,
  getAddress,
  addAddress,
  updateAddress,
  deleteAddress,
} from "./address.js";

// Avatar management
import { uploadAvatar, deleteAvatar } from "./avatar.js";

// Authentication
import {
  registerUser,
  loginUser,
  getCurrentUser,
  refreshToken,
  logout,
} from "./auth.js";

export {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserAddresses,
  getAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  uploadAvatar,
  deleteAvatar,
  registerUser,
  loginUser,
  getCurrentUser,
  refreshToken,
  logout,
};

export default {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserAddresses,
  getAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  uploadAvatar,
  deleteAvatar,
};
