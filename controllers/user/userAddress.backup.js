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
    res
      .status(500)
      .json({ success: false, message: "Failed to get addresses" });
  }
};

// Get single address
export const getAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const addressId = Number(req.params.id);

    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address ID" });
    }

    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
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
      name,
      phone,
      company,
      addressLine,
      province,
      district,
      ward,
    } = req.body;

    if (
      !name ||
      !phone ||
      !addressLine ||
      !province ||
      !district ||
      !ward
    ) {
      return res.status(400).json({
        success: false,
        message: "All required address fields must be provided",
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
      !street ||
      !ward ||
      !district ||
      !city
    ) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required",
      });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        recipientName,
        recipientPhone,
        street,
        ward,
        district,
        city,
        isDefault: isDefault || false,
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
      recipientName,
      recipientPhone,
      street,
      ward,
      district,
      city,
      isDefault,
    } = req.body;

    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address ID" });
    }

    // Check ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existingAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    // Build update data
    const updateData = {};
    if (recipientName !== undefined) updateData.recipientName = recipientName;
    if (recipientPhone !== undefined)
      updateData.recipientPhone = recipientPhone;
    if (street !== undefined) updateData.street = street;
    if (ward !== undefined) updateData.ward = ward;
    if (district !== undefined) updateData.district = district;
    if (city !== undefined) updateData.city = city;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    // If setting as default, unset others
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          NOT: { id: addressId },
        },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });

    res.json({ success: true, address: updatedAddress });
  } catch (error) {
    console.error("updateAddress error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update address" });
  }
};

// Delete address
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const addressId = Number(req.params.id);

    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address ID" });
    }

    // Check ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existingAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("deleteAddress error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete address" });
  }
};

// Set default address
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const addressId = Number(req.params.id);

    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address ID" });
    }

    // Check ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existingAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    // Unset all defaults for this user
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set this address as default
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    res.json({ success: true, address: updatedAddress });
  } catch (error) {
    console.error("setDefaultAddress error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to set default address" });
  }
};
