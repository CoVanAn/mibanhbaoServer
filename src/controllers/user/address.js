import userService from "../../services/user.service.js";
import { createControllerErrorHandler } from "../../utils/controllerError.js";
import { parsePositiveInt } from "../../utils/id.js";

const handleError = createControllerErrorHandler({
  defaultMessage: "Lỗi server",
  includeOperationalErrors: true,
});

// Get user addresses
export const getUserAddresses = async (req, res) => {
  try {
    const addresses = await userService.getAddresses(req.userId);
    return res.json({ success: true, addresses });
  } catch (error) {
    return handleError(res, error);
  }
};

// Get single address
export const getAddress = async (req, res) => {
  try {
    const addressId = parsePositiveInt(req.params.id);
    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "ID địa chỉ không hợp lệ" });
    }
    const address = await userService.getAddress(req.userId, addressId);
    return res.json({ success: true, address });
  } catch (error) {
    return handleError(res, error);
  }
};

// Add new address
export const addAddress = async (req, res) => {
  try {
    const address = await userService.addAddress(req.userId, req.body);
    return res.json({ success: true, address });
  } catch (error) {
    return handleError(res, error);
  }
};

// Update address
export const updateAddress = async (req, res) => {
  try {
    const addressId = parsePositiveInt(req.params.id);
    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "ID địa chỉ không hợp lệ" });
    }
    const address = await userService.updateAddress(
      req.userId,
      addressId,
      req.body,
    );
    return res.json({ success: true, address });
  } catch (error) {
    return handleError(res, error);
  }
};

// Delete address
export const deleteAddress = async (req, res) => {
  try {
    const addressId = parsePositiveInt(req.params.id);
    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "ID địa chỉ không hợp lệ" });
    }
    await userService.deleteAddress(req.userId, addressId);
    return res.json({ success: true, message: "Xóa địa chỉ thành công" });
  } catch (error) {
    return handleError(res, error);
  }
};
