const request = require('supertest');
const { expect } = require('expect');

const app = require('../index');

describe("Testing GET: teacher/1 endpoint", () => {
  it('respond with valid HTTP status code and data', async () => {
    const response = await request(app)
      .get('/teacher/1')
    // .send({ title: 'How to write a answer', body: 'Access the Educative answer tutorial' });

    expect(response.status).toBe(200);
    expect(response.body.teacher_id).toBe(1)
  });
})


describe("Testing GET: chat/conversation/1 endpoint with authorization header", () => {
  it('respond with valid HTTP status code and data', async () => {
    const response = await request(app)
      .get('/chat/conversation/1')
      .set('authorization', 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxNiwiZmlyc3RfbmFtZSI6IlN0ZXBoZW4iLCJsYXN0X25hbWUiOiJIYW5uYSIsImVtYWlsIjoic2hhbm5hQGdtYWlsLmNvbSIsInBhc3N3b3JkX2hhc2giOiIkMmIkMTAkLklNRUVLRGguY0pLSm5Cd2dUS211dUZyL3JYR1dVVjYzVjUyRFpJYzdqRWYwT29vSmJLRVMiLCJkb2IiOiIxOTc4LTA3LTAyVDIzOjAwOjAwLjAwMFoiLCJyZWdpc3RlcmVkX3RpbWVzdGFtcCI6IjIwMjItMTAtMDNUMTY6NTI6NDkuMDAwWiIsInByb2ZpbGVfaW1hZ2VfdXJsIjpudWxsfQ.4LvGCYlmX5rBZ4ZrS6BReSe9nTeNDBtfa59sk2UQEzk')

    expect(response.status).toBe(200);
    expect(response.body.chat_id).toBe(1)
  });
})

describe("Testing GET: chat/conversation/1 endpoint without authorization header", () => {
  it('respond with valid HTTP status code and data', async () => {
    const response = await request(app)
      .get('/chat/conversation/1')

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("User not logged in")
  });
})