const hrRouter = require('./hr');
// const gdRouter = require('./gd');  // Teammate adds this line later

module.exports = (app) => {
  app.use('/api', hrRouter);
  // app.use('/api', gdRouter);  // Auto-mounts when added
};
