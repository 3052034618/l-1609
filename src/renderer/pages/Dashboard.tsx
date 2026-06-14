import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Progress, List } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  CarOutlined,
  CalendarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { api, Student, Coach, Vehicle, Schedule, Appointment } from '../services/api';
import { SCHEDULE_STATUS_NAMES, SUBJECT_NAMES } from '../utils/validators';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [sData, cData, vData, scData, aData] = await Promise.all([
      api.getStudents(),
      api.getCoaches(),
      api.getVehicles(),
      api.getSchedules(),
      api.getAppointments()
    ]);
    setStudents(sData);
    setCoaches(cData);
    setVehicles(vData);
    setSchedules(scData);
    setAppointments(aData);
  }

  const activeStudents = students.filter(s => s.status === 'active');
  const availableVehicles = vehicles.filter(v => v.status === 'available');
  const today = new Date().toISOString().split('T')[0];
  const todaySchedules = schedules.filter(s => s.date === today);
  const todayAppointments = appointments.filter(a => a.date === today && a.status !== 'cancelled');
  const totalHours = appointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.actualHours, 0);

  const studentsProgressData = activeStudents.slice(0, 5).map(s => ({
    key: s.id,
    name: s.name,
    subject: SUBJECT_NAMES[s.currentSubject],
    progress: Math.round((s.completedHours / s.totalHours) * 100),
    remaining: s.remainingHours
  }));

  const progressColumns = [
    {
      title: '学员姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '当前科目',
      dataIndex: 'subject',
      key: 'subject'
    },
    {
      title: '学习进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress} size="small" />
      )
    },
    {
      title: '剩余学时',
      dataIndex: 'remaining',
      key: 'remaining',
      render: (v: number) => `${v} 小时`
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">工作台</h2>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="在读学员"
              value={activeStudents.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="在岗教练"
              value={coaches.filter(c => c.status === 'active').length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="可用车辆"
              value={availableVehicles.length}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="累计学时"
              value={totalHours}
              prefix={<ClockCircleOutlined />}
              suffix="小时"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<span><CalendarOutlined /> 今日排班</span>}>
            {todaySchedules.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                今日暂无排班
              </div>
            ) : (
              <List
                dataSource={todaySchedules}
                renderItem={(item) => {
                  const coach = coaches.find(c => c.id === item.coachId);
                  const vehicle = vehicles.find(v => v.id === item.vehicleId);
                  const statusColor = item.status === 'approved' ? 'green'
                    : item.status === 'pending' ? 'orange'
                    : item.status === 'rejected' ? 'red' : 'blue';
                  return (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.startTime} - {item.endTime}</span>
                            <Tag color={statusColor}>{SCHEDULE_STATUS_NAMES[item.status]}</Tag>
                          </div>
                        }
                        description={
                          <div>
                            <div>教练：{coach?.name || '-'}</div>
                            <div>车辆：{vehicle?.plateNumber || '-'}</div>
                            <div>学员数：{item.studentIds.length} 人</div>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span><TeamOutlined /> 学员学习进度</span>}>
            <Table
              columns={progressColumns}
              dataSource={studentsProgressData}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title={<span><ClockCircleOutlined /> 今日预约</span>}>
            {todayAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                今日暂无预约
              </div>
            ) : (
              <Table
                size="small"
                pagination={false}
                dataSource={todayAppointments}
                rowKey="id"
                columns={[
                  { title: '时段', dataIndex: 'startTime', render: (_v, r) => `${r.startTime} - ${r.endTime}` },
                  {
                    title: '学员',
                    dataIndex: 'studentId',
                    render: (id) => students.find(s => s.id === id)?.name || '-'
                  },
                  {
                    title: '教练',
                    dataIndex: 'coachId',
                    render: (id) => coaches.find(c => c.id === id)?.name || '-'
                  },
                  {
                    title: '科目',
                    dataIndex: 'subject',
                    render: (s) => SUBJECT_NAMES[s]
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    render: (s) => (
                      <Tag color={s === 'booked' ? 'blue' : s === 'completed' ? 'green' : 'orange'}>
                        {s === 'booked' ? '已预约' : s === 'completed' ? '已完成' : s}
                      </Tag>
                    )
                  }
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
