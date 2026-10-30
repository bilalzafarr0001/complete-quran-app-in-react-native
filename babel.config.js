module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Settings such as the AI key come from .env (not committed to git);
    // tests use the placeholders in .env.example instead.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: process.env.NODE_ENV === 'test' ? '.env.example' : '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};
