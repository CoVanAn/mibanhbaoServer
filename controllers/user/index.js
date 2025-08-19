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
