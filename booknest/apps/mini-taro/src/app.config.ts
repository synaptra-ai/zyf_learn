export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/categories/index',
    'pages/me/index',
    'pages/login/index',
  ],
  subPackages: [
    {
      root: 'sub/books',
      pages: ['pages/detail/index', 'pages/form/index'],
    },
    {
      root: 'sub/orders',
      pages: ['pages/result/index'],
    },
    {
      root: 'sub/admin',
      pages: ['pages/content-security/index'],
    },
    {
      root: 'sub/activities',
      pages: ['pages/list/index', 'pages/detail/index'],
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F7F3EE',
    navigationBarTitleText: 'BookNest',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    custom: true,
    color: '#B0A79F',
    selectedColor: '#8B7355',
    backgroundColor: '#FDFBF8',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '书架' },
      { pagePath: 'pages/categories/index', text: '分类' },
      { pagePath: 'pages/me/index', text: '我的' },
    ],
  },
  preloadRule: {
    'pages/index/index': {
      network: 'all',
      packages: ['sub/books'],
    },
    'pages/me/index': {
      network: 'all',
      packages: ['sub/admin'],
    },
  },
})
