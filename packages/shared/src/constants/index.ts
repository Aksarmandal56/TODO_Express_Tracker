export const API_VERSION = 'v1';
export const API_PREFIX = `api/${API_VERSION}`;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const JWT_DEFAULTS = {
  ACCESS_TOKEN_EXPIRES: '15m',
  REFRESH_TOKEN_EXPIRES: '7d',
} as const;

export const SUBSCRIPTION_LIMITS = {
  free: {
    tasks: 50,
    reminders: 10,
    resumeAiEnhancements: 3,
    expenseUploads: 5,
  },
  pro: {
    tasks: 1000,
    reminders: 100,
    resumeAiEnhancements: 100,
    expenseUploads: 100,
  },
  enterprise: {
    tasks: Infinity,
    reminders: Infinity,
    resumeAiEnhancements: Infinity,
    expenseUploads: Infinity,
  },
} as const;

export const FILE_UPLOAD_LIMITS = {
  PDF_MAX_SIZE_MB: 10,
  DOCUMENT_MAX_SIZE_MB: 25,
} as const;

export const SOCKET_EVENTS = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  REMINDER_DUE: 'reminder:due',
} as const;
