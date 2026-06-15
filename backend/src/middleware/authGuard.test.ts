import { Request, Response, NextFunction } from 'express';
import { authGuard } from './authGuard';

function createMockReq(sessionUser?: any): Partial<Request> {
  return {
    session: sessionUser !== undefined
      ? { user: sessionUser } as any
      : {} as any,
  };
}

function createMockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authGuard middleware', () => {
  it('should call next() and attach user when session has valid user', () => {
    const user = { id: 1, email: 'test@example.com', name: 'Test', role: 'user' };
    const req = createMockReq(user) as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    authGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(user);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when session has no user', () => {
    const req = createMockReq(undefined) as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    authGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('should return 401 when session is missing entirely', () => {
    const req = { session: undefined } as unknown as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    authGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('should return 401 when session.user is null', () => {
    const req = createMockReq(null) as Request;
    const res = createMockRes() as Response;
    const next: NextFunction = jest.fn();

    authGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
