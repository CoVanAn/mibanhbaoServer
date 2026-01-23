// Profile management
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
} from "./userProfile.js";

// Address management
import {
  getUserAddresses,
  getAddress,
  addAddress,
  updateAddress,
  deleteAddress,
} from "./userAddress.js";

// Avatar management
import { uploadAvatar, deleteAvatar } from "./userAvatar.js";

// Authentication
import {
  registerUser,
  loginUser,
  getCurrentUser,
  refreshToken,
  logout,
} from "./userAuth.js";

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
