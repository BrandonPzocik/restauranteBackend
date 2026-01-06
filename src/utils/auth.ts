import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generateToken = (userId: number, role: string) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET!, { expiresIn: '1d' });
};