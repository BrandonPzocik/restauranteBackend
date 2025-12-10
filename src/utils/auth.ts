import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

export const generateToken = (userId: number, role: string) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET!, { expiresIn: '1d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!) as { id: number; role: string };
};