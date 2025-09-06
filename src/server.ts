import 'dotenv/config';
import { app } from './app';
import { pool } from './config/database';
import { AppDataSource } from './data-source';

const start = async () => {
  try {
    await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    // Initialize TypeORM data source
    await AppDataSource.initialize();
    app.log.info('Database connected successfully');
    
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || 'localhost';
    
    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();