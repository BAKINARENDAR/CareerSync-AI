const hrRouter = require('./hr');
const technicalRouter = require('./technical'); 

module.exports = (app) => {
  app.use('/api/hr', hrRouter);
  app.use('/api/technical', technicalRouter);
};
