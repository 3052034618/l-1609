import { useState, useEffect, useMemo } from 'react';
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
  Badge,
  Tooltip
} from 'antd';
import {
  WarningOutlined,
  UserOutlined,
  CheckOutlined,
  SyncOutlined,
  BellOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api, Alert as AlertType, Student } from '../services/api';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const studentMap = useMemo(() => {
    const m: Record<string, Student> = {};
    for (const s of students) m[s.id] = s;
    return m;
  }, [students]);

  const enrichedAlerts = useMemo(() => {
    return alerts.map(a => {
      const s = studentMap[a.studentId];
      return {
        ...a,
        _studentName: s?.name || '-',
        _studentPhoto: s?.photo,
        _relativeCreated: dayjs(a.createdAt).fromNow(),
        _absoluteCreated: dayjs(a.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        _relativeHandled: a.handledAt ? dayjs(a.handledAt).fromNow() : '',
        _absoluteHandled: a.handledAt ? dayjs(a.handledAt).format('YYYY-MM-DD HH:mm:ss') : ''
      };
    });
  }, [alerts, studentMap, tick]);

  const pendingAlerts = useMemo(() => enrichedAlerts.filter(a => !a.handled), [enrichedAlerts]);
  const handledAlerts = useMemo(() => enrichedAlerts.filter(a => a.handled), [enrichedAlerts]);

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
      window.dispatchEvent(new CustomEvent('alerts-updated'));
    } catch (e: any) {
      message.error(e.message || '检测失败');
    }
  }

  async function handleMarkHandled(id: string) {
    try {
      await api.markAlertHandled(id);
      const a = alerts.find(x => x.id === id);
      const s = a ? studentMap[a.studentId] : undefined;
      message.success(s ? `已跟进学员【${s?.name}】的无学时预警，状态已永久保存` : '已标记为已处理，状态已永久保存');
      await loadData();
      window.dispatchEvent(new CustomEvent('alerts-updated'));
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

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
      dataIndex: '_studentName',
      key: 'studentId',
      render: (_name: string, record: any) => {
        const s = studentMap[record.studentId];
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
      title: '触发时间',
      dataIndex: '_relativeCreated',
      key: 'createdAt',
      width: 180,
      sorter: (a: any, b: any) => a.createdAt.localeCompare(b.createdAt),
      render: (text: string, record: any) => (
        <Tooltip title={`绝对时间：${record._absoluteCreated}`}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: '处理信息',
      key: 'handledInfo',
      width: 170,
      render: (_: any, record: any) => record.handled ? (
        <Tooltip title={`处理时间：${record._absoluteHandled || '-'}`}>
          <Tag color="green">已跟进 · {record._relativeHandled || '刚刚'}</Tag>
        </Tooltip>
      ) : (
        <Badge status="processing" text="待跟进" />
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: AlertType) => !record.handled && (
        <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleMarkHandled(record.id)}>
          已跟进
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
        <Card title={<span><WarningOutlined style={{ color: '#faad14' }} /> 待处理预警（含相对触发时间）</span>} style={{ marginBottom: 16 }}>
          <List
            dataSource={pendingAlerts.slice(0, 5)}
            renderItem={item => {
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
                        <Avatar src={item._studentPhoto} icon={<UserOutlined />} />
                      </Badge>
                    }
                    title={
                      <Space>
                        <Tag color="orange">无学时预警</Tag>
                        <strong>{item._studentName}</strong>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <span>{item.message}</span>
                        <Tooltip title={`首次触发时间：${item._absoluteCreated}`}>
                          <span style={{ color: '#999' }}>⏰ {item._relativeCreated}</span>
                        </Tooltip>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>
      )}

      <Card title="全部预警记录（相对时间每分钟自动刷新）">
        {enrichedAlerts.length === 0 ? (
          <Empty description="暂无预警记录" />
        ) : (
          <Table
            columns={columns}
            dataSource={enrichedAlerts}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
}
