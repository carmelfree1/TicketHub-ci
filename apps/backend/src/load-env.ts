import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDirectory = fileURLToPath(new URL('../', import.meta.url));

// Support both package-local deployment variables and the repository-level .env used by Compose.
config({ path: resolve(backendDirectory, '.env') });
config({ path: resolve(backendDirectory, '../../.env') });
