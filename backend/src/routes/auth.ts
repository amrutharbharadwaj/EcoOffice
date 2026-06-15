import { Router } from 'express';
import { registerValidation, loginValidation } from '../validators/authValidators';
import * as authController from '../controllers/authController';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// POST /auth/register — Create a new user account
router.post('/register', registerValidation, authController.register);

// POST /auth/login — Authenticate and create session
router.post('/login', loginRateLimiter, loginValidation, authController.login);

// POST /auth/logout — Destroy session (requires authentication)
router.post('/logout', authGuard, authController.logout);

export default router;
