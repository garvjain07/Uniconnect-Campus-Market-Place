const request = require('supertest');
const jwt = require('jsonwebtoken');

const users = [];

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../models/User', () => ({
  create: jest.fn(async (payload) => {
    const user = {
      ...payload,
      _id: payload._id || `${users.length + 1}`,
      collegeDomain: payload.email.split('@')[1],
      verified: payload.verified || false,
      refreshTokens: [],
      save: jest.fn().mockResolvedValue(true),
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    users.push(user);
    return user;
  }),
  findOne: jest.fn(async (query) => users.find((u) => u.email === query.email)),
  findById: jest.fn(async (id) => users.find((u) => u._id === id)),
  deleteOne: jest.fn(async (query) => {
    const index = users.findIndex((u) => u._id === query._id);
    if (index >= 0) users.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  }),
}));

const app = require('../app');
const User = require('../models/User');

describe('auth controller', () => {
  beforeEach(() => {
    users.length = 0;
  });

  it('registers user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'test@college.edu',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@college.edu');
  });

  it('allows login for password-only users', async () => {
    await User.create({
      name: 'Login',
      email: 'login@college.edu',
      password: 'password123',
      verified: false,
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@college.edu',
      password: 'password123',
    });
    expect(res.status).toBe(200);
  });

  it('refreshes token', async () => {
    await User.create({
      _id: '123',
      name: 'Refresh',
      email: 'refresh@college.edu',
      password: 'password123',
      verified: true,
      refreshTokens: [],
    });
    const token = jwt.sign({ id: '123', role: 'user', collegeDomain: 'college.edu' }, process.env.JWT_REFRESH_SECRET || 'refresh');
    users[0].refreshTokens.push({ token });
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});
