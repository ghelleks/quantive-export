module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '16'
        }
      }
    ]
  ],
  
  // Transform settings for Google Apps Script files
  overrides: [
    {
      test: /\.gs$/,
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: '16'
            }
          }
        ]
      ]
    }
  ]
};