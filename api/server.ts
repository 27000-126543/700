/**
 * local server entry file, for local development
 */
import app from './app.js';
import { startSimulation, stopSimulation } from './services/simulator.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

process.on('uncaughtException', (err: Error) => {
  if ('code' in err && (err as any).code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying port ${Number(PORT) + 1}...`);
    const newPort = Number(PORT) + 1;
    startServer(newPort);
  } else {
    console.error('Uncaught Exception:', err);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

function startServer(port: number) {
  const server = app.listen(port, () => {
    console.log(`Server ready on port ${port}`);
    
    setTimeout(() => {
      try {
        startSimulation();
      } catch (error) {
        console.error('Failed to start simulation:', error);
      }
    }, 2000);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    stopSimulation();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received');
    stopSimulation();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

startServer(Number(PORT));

export default app;