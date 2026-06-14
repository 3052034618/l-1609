import { useState, useEffect } from 'react';
import { Layout, Menu, Badge } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  CarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  FormOutlined,
  BellOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Coaches from './pages/Coaches';
import Vehicles from './pages/Vehicles';
import Schedules from './pages/Schedules';
import Appointments from './pages/Appointments';
import Exams from './pages/Exams';
import Alerts from './pages/Alerts';
import Statistics from './pages/Statistics';
import { api } from './services/api';
import { Alert } from './services/api';

const { Header, Sider, Content } = Layout;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadAlerts() {
    try {
      await api.checkInactiveStudents();
      const data = await api.getAlerts();
      setAlerts(data.filter(a => !a.handled));
    } catch (e) {
      console.error(e);
    }
  }

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/students', icon: <TeamOutlined />, label: '学员管理' },
    { key: '/coaches', icon: <UserOutlined />, label: '教练管理' },
    { key: '/vehicles', icon: <CarOutlined />, label: '车辆管理' },
    { key: '/schedules', icon: <CalendarOutlined />, label: '智能排班' },
    { key: '/appointments', icon: <FormOutlined />, label: '预约管理' },
    { key: '/exams', icon: <FileTextOutlined />, label: '考试管理' },
    {
      key: '/alerts',
      icon: (
        <Badge count={alerts.length} size="small" offset={[8, -2]}>
          <BellOutlined />
        </Badge>
      ),
      label: '预警中心'
    },
    { key: '/statistics', icon: <BarChartOutlined />, label: '统计报表' }
  ];

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">🚗 驾校学员管理与智能调度系统</div>
      </Header>
      <Layout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content className="app-content">
          <div className="content-card">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/coaches" element={<Coaches />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/schedules" element={<Schedules />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/statistics" element={<Statistics />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
