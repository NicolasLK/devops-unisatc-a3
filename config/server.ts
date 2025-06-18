module.exports = ({ env }) => ({
  host: '127.0.0.1', // Força IPv4
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
