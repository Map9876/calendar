import { createApp } from 'vue'
import App from './App.vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
const app = createApp(App)

// 使用 Ant Design Vue
app.use(Antd)
// 使用路由
// 挂载应用
app.mount('#app')
