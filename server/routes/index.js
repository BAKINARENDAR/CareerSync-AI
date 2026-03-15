// routes/index.js
const hrRouter = require('./hr');
const technicalRouter = require('./technical');
const gdRouter = require('./gd'); // Import the GD file

module.exports = (app, rooms) => {
  app.use('/api', hrRouter);
  app.use('/api/technical', technicalRouter);
  
  // Pass the rooms object to the GD router
  app.use('/api/gd', gdRouter(rooms)); 
};