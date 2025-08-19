import prisma from "../../config/prisma.js";

// Get user addresses  
export const getUserAddresses = async (req, res) => {
  try {
    const userId = req.userId;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ id: "desc" }],
    });

    res.json({ success: true, addresses });
  } catch (error) {
    console.error("getUserAddresses error:", error);
    res.status(500).json({ success: false, message: "Failed to get addresses" });
  }
};

// Get single address
export const getAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const addressId = Number(req.params.id);

    if (!addressId) {
      return res.status(400).json({ success: false, message: "Invalid address ID" });
    }

    const address = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId 
      }
    });

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    res.json({ success: true, address });
  } catch (error) {
    console.error("getAddress error:", error);
    res.status(500).json({ success: false, message: "Failed to get address" });
  }
};

// Add new address
export const addAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,        // Tên người nhận
      phone,       // Số điện thoại người nhận  
      company,     // Công ty (optional)
      addressLine, // Địa chỉ chi tiết
      province,    // Tỉnh/Thành phố
      district,    // Quận/Huyện
      ward,        // Phường/Xã
    } = req.body;

    if (!name || !phone || !addressLine || !province || !district || !ward) {
      return res.status(400).json({
        success: false,
        message: "Required fields: name, phone, addressLine, province, district, ward",
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        name,
        phone,
        company: company || null,
        addressLine,
        province,
        district,
        ward,
      },
    });

    res.json({ success: true, address });
  } catch (error) {
    console.error("addAddress error:", error);
    res.status(500).json({ success: false, message: "Failed to add address" });
  }
};

// Update address
export const updateAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const addressId = Number(req.params.id);
    const {
      name,
      phone,
      company,
      addressLine,
      province,
      district,
      ward,
    } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, message: "Invalid address ID" });
    }

    // Check ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existingAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (addressLine !== undefined) updateData.addressLine = addressLine;
    if (province !== undefined) updateData.province = province;
    if (district !== undefined) updateData.district = district;
    if (ward !== undefined) updateData.ward = ward;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: updateData
    });

    res.json({ success: true, address: updatedAddress });
  } catch (error) {
    console.error("updateAddress error:", error);
    res.status(500).json({ success: false, message: "Failed to update address" });
  }
};

// Delete address
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const addressId = Number(req.params.id);

    if (!addressId) {
      return res.status(400).json({ success: false, message: "Invalid address ID" });
    }

    // Check ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existingAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    await prisma.address.delete({
      where: { id: addressId }
    });

    res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("deleteAddress error:", error);
    res.status(500).json({ success: false, message: "Failed to delete address" });
  }
};
