export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/categories/index',
    'pages/me/index',
    'pages/login/index',
    'pages/books/detail/index',
    'pages/books/form/index',
    'pages/orders/result/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: 'BookNest',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#64748b',
    selectedColor: '#2563eb',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '书架' },
      { pagePath: 'pages/categories/index', text: '分类' },
      { pagePath: 'pages/me/index', text: '我的' },
    ],
  },
})
