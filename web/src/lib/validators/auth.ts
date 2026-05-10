import { z } from 'zod';

export const emailSchema = z.email('Please enter a valid email address');
