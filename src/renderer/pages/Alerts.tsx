import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  message,
  Space,
  Card,
  Empty,
  List,
  Avatar,
  Badge
} from 'antd';
import {
  WarningOutlined,
  UserOutlined,
  CheckOutlined,
  SyncOutlined,
  BellOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, Alert as AlertType, Student } from '../services/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [aData, sData] = await Promise.all([
        api.getAlerts(),
        api.getStudents()
      ]);
      setAlerts(aData.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setStudents(sData);
    } catch (e: any) {
      message.error(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck() {
    try {
      const newAlerts = await api.checkInactiveStudents();
      if (newAlerts.length > 0) {
        message.success(`检测到 ${newAlerts.length} 条新预警`);
      } else {
        message.success('暂无新预警');
      }
      loadData();
    } catch (e: any) {
      message.error(e.message || '检测失败');
    }
  }

  async function handleMarkHandled(id: string) {
    try {
      const index = alerts.findIndex(a => a.id === id);
      if (index === -1) return;
      const newAlerts = [...alerts];
      newAlerts[index] = {
        ...newAlerts[index],
        handled: true,
        handledBy: 'admin',
        handledAt: new Date().toISOString(),
        read: true
      };
      setAlerts(newAlerts);
      message.success('已标记为已处理');
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  const pendingAlerts = alerts.filter(a => !a.handled);
  const handledAlerts = alerts.filter(a => a.handled);

  function getAlertIcon(type: string) {
    switch (type) {
      case 'inactive_student':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'upcoming_exam':
        return <BellOutlined style={{ color: '#1677ff' }} />;
      case 'low_hours':
        return <WarningOutlined style={{ color: '#722ed1' }} />;
      default:
        return <WarningOutlined />;
    }
  }

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const colors: Record<string, string> = {
          inactive_student: 'orange',
          upcoming_exam: 'blue',
          low_hours: 'purple'
        };
        const names: Record<string, string> = {
          inactive_student: '无学时预警',
          upcoming_exam: '考试提醒',
          low_hours: '学时不足'
        };
        return <Tag color={colors[type]} icon={getAlertIcon(type)}>{names[type] || type}</Tag>;
      }
    },
    {
      title: '学员',
      dataIndex: 'studentId',
      key: 'studentId',
      render: (id: string) => {
        const s = students.find(x => x.id === id);
        return s ? (
          <span>
            <Avatar size={24} src={s.photo} icon={<UserOutlined />} style={{ marginRight: 8 }} />
            {s.name}
          </span>
        ) : '-';
      }
    },
    { title: '预警内容', dataIndex: 'message', key: 'message' },
    {
      title: '预警时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '状态',
      dataIndex: 'handled',
      key: 'handled',
      width: 100,
      render: (handled: boolean) => handled
        ? <Tag color="green">已处理</Tag>
        : <Badge status="processing" text="待处理" />
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: AlertType) => !record.handled && (
        <Button type="link" icon={<CheckOutlined />} onClick={() => handleMarkHandled(record.id)}>
          标记已处理
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">预警中心</h2>
        <Button icon={<SyncOutlined />} onClick={handleCheck}>
          检测学员状态
        </Button>
      </div>

      <Space style={{ marginBottom: 24 }} size={16}>
        <Card size="small">
          <Space>
            <WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#faad14' }}>{pendingAlerts.length}</div>
              <div style={{ color: '#666', fontSize: 12 }}>待处理预警</div>
            </div>
          </Space>
        </Card>
        <Card size="small">
          <Space>
            <CheckOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>{handledAlerts.length}</div>
              <div style={{ color: '#666', fontSize: 12 }}>已处理</div>
            </div>
          </Space>
        </Card>
        <Card size="small">
          <Space>
            <BellOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1677ff' }}>{alerts.length}</div>
              <div style={{ color: '#666', fontSize: 12 }}>预警总数</div>
            </div>
          </Space>
        </Card>
      </Space>

      {pendingAlerts.length > 0 && (
        <Card title={<span><WarningOutlined style={{ color: '#faad14' }} /> 待处理预警</span>} style={{ marginBottom: 16 }}>
          <List
            dataSource={pendingAlerts.slice(0, 5)}
            renderItem={item => {
              const student = students.find(s => s.id === item.studentId);
              return (
                <List.Item
                  actions={[
                    <Button type="primary" size="small" onClick={() => handleMarkHandled(item.id)}>
                      已跟进
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot color="red">
                        <Avatar src={student?.photo} icon={<UserOutlined />} />
                      </Badge>
                    }
                    title={
                      <Space>
                        <Tag color="orange">无学时预警</Tag>
                        <strong>{student?.name || '未知学员'}</strong>
                      </Space>
                    }
                    description={
                      <Space>
                        <span>{item.message}</span>
                        <span style={{ color: '#999' }}>{dayjs(item.createdAt).fromNow()}</span>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>
      )}

      <Card title="全部预警记录">
        {alerts.length === 0 ? (
          <Empty description="暂无预警记录" />
        ) : (
          <Table
            columns={columns}
            dataSource={alerts}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
}
