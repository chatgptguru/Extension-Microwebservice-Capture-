import { registerAs } from '@nestjs/config';

export default registerAs('mongodb', () => ({
  uri: process.env.MONGODB_URI || 'mongodb+srv://freelnacer:schmsg4c7yllnh27l0md@cluster0.d416l.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
}));
