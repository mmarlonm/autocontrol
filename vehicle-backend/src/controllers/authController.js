const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_autocontrol_mexico_2026';
const JWT_EXPIRES_IN = '30d';

const generateToken = (userId, email) => {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const AuthController = {
  register: async (req, res) => {
    try {
      const { email, password, fcm_token } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son obligatorios.'
        });
      }

      // Validacion básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'El formato de correo electrónico no es válido.'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres.'
        });
      }

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una cuenta registrada con este correo.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await UserModel.create(email, passwordHash);

      if (fcm_token) {
        await UserModel.updateFcmToken(newUser.id, fcm_token);
        newUser.fcm_token = fcm_token;
      }

      const token = generateToken(newUser.id, newUser.email);

      return res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente.',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            fcm_token: newUser.fcm_token
          },
          token
        }
      });
    } catch (error) {
      console.error('[AuthController.register] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno al registrar usuario.',
        error: error.message
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password, fcm_token } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos.'
        });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas.'
        });
      }

      if (fcm_token && fcm_token !== user.fcm_token) {
        await UserModel.updateFcmToken(user.id, fcm_token);
        user.fcm_token = fcm_token;
      }

      const token = generateToken(user.id, user.email);

      return res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fcm_token: user.fcm_token
          },
          token
        }
      });
    } catch (error) {
      console.error('[AuthController.login] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno en inicio de sesión.',
        error: error.message
      });
    }
  },

  getProfile: async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener perfil.',
        error: error.message
      });
    }
  },

  updateFcmToken: async (req, res) => {
    try {
      const { fcm_token } = req.body;
      if (!fcm_token) {
        return res.status(400).json({
          success: false,
          message: 'Token FCM es requerido.'
        });
      }

      const updatedUser = await UserModel.updateFcmToken(req.user.id, fcm_token);

      return res.status(200).json({
        success: true,
        message: 'Token FCM actualizado correctamente.',
        data: {
          fcm_token: updatedUser.fcm_token
        }
      });
    } catch (error) {
      console.error('[AuthController.updateFcmToken] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar token FCM.',
        error: error.message
      });
    }
  }
};

module.exports = AuthController;
