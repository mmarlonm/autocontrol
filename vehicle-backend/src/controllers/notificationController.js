const NotificationModel = require('../models/notificationModel');
const FcmService = require('../services/fcmService');

const NotificationController = {
  getNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      const notifications = await NotificationModel.getByUserId(userId);
      const unreadCount = await NotificationModel.getUnreadCount(userId);

      return res.status(200).json({
        success: true,
        data: {
          unread_count: unreadCount,
          notifications
        }
      });
    } catch (error) {
      console.error('[NotificationController.getNotifications] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener notificaciones.',
        error: error.message
      });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const updated = await NotificationModel.markAsRead(id, userId);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada o no pertenece al usuario.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notificación marcada como leída.'
      });
    } catch (error) {
      console.error('[NotificationController.markAsRead] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar estado de la notificación.',
        error: error.message
      });
    }
  },

  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.id;
      await NotificationModel.markAllAsRead(userId);

      return res.status(200).json({
        success: true,
        message: 'Todas las notificaciones han sido marcadas como leídas.'
      });
    } catch (error) {
      console.error('[NotificationController.markAllAsRead] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al marcar notificaciones.',
        error: error.message
      });
    }
  },

  sendTestNotification: async (req, res) => {
    try {
      const user = req.user;
      const { title = '¡Prueba de Notificación Push!', message = 'El sistema de tenencias vehiculares está activo.' } = req.body;

      // 1. Guardar en Base de Datos (con manejo de restricción UNIQUE)
      const notifRecord = await NotificationModel.create({
        userId: user.id,
        type: 'PROMOTION',
        title,
        message
      });

      // 2. Enviar Push vía FCM si el usuario tiene token registrado
      let fcmResult = null;
      if (user.fcm_token) {
        fcmResult = await FcmService.sendNotification(user.fcm_token, {
          title,
          body: message,
          data: { type: 'TEST_PUSH', userId: user.id.toString() }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notificación de prueba procesada.',
        data: {
          notification: notifRecord,
          fcm: fcmResult
        }
      });
    } catch (error) {
      console.error('[NotificationController.sendTestNotification] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar notificación de prueba.',
        error: error.message
      });
    }
  }
};

module.exports = NotificationController;

