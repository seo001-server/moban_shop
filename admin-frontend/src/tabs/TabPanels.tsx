import { Route, Routes } from 'react-router-dom'
import BusinessPage from '../pages/BusinessPage'
import DashboardPage from '../pages/DashboardPage'
import OrderDetailPage from '../pages/OrderDetailPage'
import OrdersPage from '../pages/OrdersPage'
import ProductFormPage from '../pages/ProductFormPage'
import ProductsPage from '../pages/ProductsPage'
import UserDetailPage from '../pages/UserDetailPage'
import UsersPage from '../pages/UsersPage'
import { tabToLocation, useTabs } from './TabContext'
import { TabPageProvider } from './TabPageContext'

export function TabPanels() {
  const { tabs, activeKey } = useTabs()

  return (
    <div className="admin-tab-panels">
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        return (
          <TabPageProvider key={tab.key} tabKey={tab.key} isActive={active}>
            <div
              className="admin-tab-panel"
              hidden={!active}
              aria-hidden={!active}
              {...(!active ? { inert: true } : {})}
            >
              <Routes location={tabToLocation(tab)}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/templates/new" element={<ProductFormPage />} />
                <Route path="/templates" element={<ProductsPage />} />
                <Route path="/business" element={<BusinessPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                <Route path="/orders" element={<OrdersPage />} />
              </Routes>
            </div>
          </TabPageProvider>
        )
      })}
    </div>
  )
}
