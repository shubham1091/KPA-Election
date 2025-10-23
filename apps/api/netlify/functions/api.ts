import serverless from 'serverless-http';
import { createServer } from '../../src/server';

const app = createServer();
const handler = serverless(app);

export { handler };

