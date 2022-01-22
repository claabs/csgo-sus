import pino from 'pino';
import 'dotenv/config';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: `SYS:standard`,
    },
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  level: process.env.LOG_LEVEL || 'info',
});

export default logger;
