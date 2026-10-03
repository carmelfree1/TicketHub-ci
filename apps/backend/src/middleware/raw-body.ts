import express from 'express';

export const rawJsonBody = express.raw({ type: 'application/json', limit: '128kb' });
