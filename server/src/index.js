import app from './app.js';
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  AI Investment Research Server Initialized  `);
  console.log(`  Port: ${PORT}                               `);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`  Endpoint: http://localhost:${PORT}/api/research`);
  console.log(`=============================================`);
});

export default app;
