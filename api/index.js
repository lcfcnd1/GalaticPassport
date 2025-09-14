const serverlessExpress = require('@vendia/serverless-express');
const app = require('../index'); // importa tu app de Express

module.exports = serverlessExpress({ app });
