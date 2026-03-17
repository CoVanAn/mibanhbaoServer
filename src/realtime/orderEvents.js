import { getSocketServer } from "./socketServer.js";

export const ORDER_EVENTS = {
  CREATED: "order.created",
  STATUS_CHANGED: "order.status.changed",
  NOTE_UPDATED: "order.note.updated",
  CANCELED: "order.canceled",
  PAYMENT_CHANGED: "order.payment.changed",
};

const emitOrderEvent = ({ eventName, payload, orderId, userId }) => {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to("admin").emit(eventName, payload);

  if (orderId) {
    io.to(`order:${orderId}`).emit(eventName, payload);
  }

  if (userId) {
    io.to(`user:${userId}`).emit(eventName, payload);
  }
};

export const emitOrderCreated = (order) => {
  emitOrderEvent({
    eventName: ORDER_EVENTS.CREATED,
    payload: {
      id: order.id,
      code: order.code,
      status: order.status,
      method: order.method,
      total: order.total,
      userId: order.userId,
      createdAt: order.createdAt,
    },
    orderId: order.id,
    userId: order.userId,
  });
};

export const emitOrderStatusChanged = ({
  order,
  previousStatus,
  reason,
  changedByUserId,
}) => {
  emitOrderEvent({
    eventName: ORDER_EVENTS.STATUS_CHANGED,
    payload: {
      id: order.id,
      code: order.code,
      status: order.status,
      previousStatus,
      reason: reason || null,
      changedByUserId: changedByUserId || null,
      updatedAt: order.updatedAt,
      userId: order.userId,
    },
    orderId: order.id,
    userId: order.userId,
  });
};

export const emitOrderNoteUpdated = ({ order, changedByUserId }) => {
  emitOrderEvent({
    eventName: ORDER_EVENTS.NOTE_UPDATED,
    payload: {
      id: order.id,
      code: order.code,
      status: order.status,
      changedByUserId: changedByUserId || null,
      updatedAt: order.updatedAt,
      userId: order.userId,
    },
    orderId: order.id,
    userId: order.userId,
  });
};

export const emitOrderCanceled = ({ order, reason, changedByUserId }) => {
  emitOrderEvent({
    eventName: ORDER_EVENTS.CANCELED,
    payload: {
      id: order.id,
      code: order.code,
      status: order.status,
      reason: reason || null,
      changedByUserId: changedByUserId || null,
      updatedAt: order.updatedAt,
      userId: order.userId,
    },
    orderId: order.id,
    userId: order.userId,
  });
};

export const emitOrderPaymentChanged = ({
  orderId,
  orderCode,
  userId,
  payment,
}) => {
  emitOrderEvent({
    eventName: ORDER_EVENTS.PAYMENT_CHANGED,
    payload: {
      orderId,
      orderCode,
      userId,
      payment,
    },
    orderId,
    userId,
  });
};
