const match = require('./match');
const streak = require('./streak');
const conversationPolicy = require('./conversationPolicy');

module.exports = {
  ...match,
  ...streak,
  ...conversationPolicy,
};
