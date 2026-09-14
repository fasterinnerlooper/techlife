import multer from 'multer';
import { env } from '../config/env.js';

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      cb(new Error('Unsupported file type'));
      return;
    }
    cb(null, true);
  },
});
