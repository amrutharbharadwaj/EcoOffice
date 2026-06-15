import { Request, Response, NextFunction } from 'express';
import { adminGuard } from './adminGuard';

function createMockReq(user?: any): Partial<Request> {
  return { user };
}

function createMockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('adminGuard middleware', () => {
  it('should call next() when user has admin role', () => {
    const req = createMockReq({ id: 1, email: 'admin@example.com', name: 'Admin', role: 'admin' }) as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    adminGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user has non-admin role', () => {
    const req = createMockReq({ id: 2, email: 'user@example.com', name: 'User', role: 'user' }) as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    adminGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });

  it('should return 403 when req.user is undefined', () => {
    const req = createMockReq(undefined) as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    adminGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });

  it('should return 403 when req.user is null', () => {
    const req = createMockReq(null) as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    adminGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });

  it('should return 403 when user role is empty string', () => {
    const req = createMockReq({ id: 3, email: 'test@example.com', name: 'Test', role: '' }) as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    adminGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });
});
