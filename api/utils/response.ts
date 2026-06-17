import type { Response } from 'express';

export function success<T>(res: Response, data: T, message = 'success') {
  res.json({
    code: 0,
    message,
    data,
    timestamp: Date.now(),
  });
}

export function error(res: Response, message: string, code = 500, statusCode = 200) {
  res.status(statusCode).json({
    code,
    message,
    data: null,
    timestamp: Date.now(),
  });
}

export function paginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  res.json({
    code: 0,
    message: 'success',
    data: {
      items,
      total,
      page,
      pageSize,
    },
    timestamp: Date.now(),
  });
}
