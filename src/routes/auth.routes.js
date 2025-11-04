import express from 'express';
import { login, registro } from '../controllers/auth/auth.controller.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/registro', registro);
router.get('/verify', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
