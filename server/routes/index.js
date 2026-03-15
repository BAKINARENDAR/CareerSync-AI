// routes/index.js
const hrRouter = require('./hr');
const technicalRouter = require('./technical');
const gdRouter = require('./gd');

module.exports = (app, rooms) => {
  app.use('/api', hrRouter);
  app.use('/api', technicalRouter); 
  
  app.use('/api/gd', gdRouter(rooms)); 
};