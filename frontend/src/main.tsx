import '@fortawesome/fontawesome-free/css/all.min.css'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/common.css'
import './styles/list.css'
import './styles/detail.css'
import './styles/cart.css'
import './styles/index.css'
import './styles/storefront-pages.css'
import './styles/account.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { CartProvider } from './cart/CartContext.tsx'
import { ToastProvider } from './context/ToastContext.tsx'

// 不包 StrictMode：开发环境下它会对组件做一次「挂载→卸载→再挂载」，仅依赖 mount 的 effect（如拉 /api/products）会在 Network 里出现两次请求。
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>,
)
