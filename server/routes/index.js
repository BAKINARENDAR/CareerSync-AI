const hrRouter = require('./hr');

module.exports = (app) => {
  app.use('/api', hrRouter);
};
