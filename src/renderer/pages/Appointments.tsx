import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  InputNumber,
  Tag,
  message,
  Space,
  Row,
  Col,
  Descriptions
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, Appointment, Coach, Vehicle, Student, Schedule } from '../services/api';
import { SUBJECT_NAMES, APPOINTMENT_STATUS_NAMES } from '../utils/validators';

const { Option } = Select;
const { RangePicker } = TimePicker;

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateFilter, setDateFilter] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [aData, cData, vData, sData, scData] = await Promise.all([
        api.getAppointments(),
        api.getCoaches(),
        api.getVehicles(),
        api.getStudents(),
        api.getSchedules()
      ]);
      setAppointments(aData);
      setCoaches(cData);
      setVehicles(vData);
      setStudents(sData);
      setSchedules(scData);
    } catch (e: any) {
      message.error(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    form.resetFields();
    setModalOpen(true);
  }

  function handleComplete(appointment: Appointment) {
    setCompletingAppointment(appointment);
    const [sh, sm] = appointment.startTime.split(':').map(Number);
    const [eh, em] = appointment.endTime.split(':').map(Number);
    const defaultHours = (eh - sh) + (em - sm) / 60;
    completeForm.setFieldsValue({ actualHours: defaultHours });
    setCompleteOpen(true);
  }

  function handleDetail(appointment: Appointment) {
    setDetailAppointment(appointment);
    setDetailOpen(true);
  }

  async function handleSubmit(values: any) {
    try {
      const data = {
        studentId: values.studentId,
        coachId: values.coachId,
        vehicleId: values.vehicleId,
        scheduleId: values.scheduleId || null,
        date: values.date.format('YYYY-MM-DD'),
        startTime: values.timeRange[0].format('HH:mm'),
        endTime: values.timeRange[1].format('HH:mm'),
        subject: values.subject,
        status: 'booked',
        actualHours: 0
      };
      await api.createAppointment(data);
      message.success('预约成功，已锁定资源');
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e.message || '预约失败');
    }
  }

  async function handleCompleteSubmit(values: any) {
    if (!completingAppointment) return;
    try {
      await api.completeAppointment(completingAppointment.id, values.actualHours);
      message.success(`已记录 ${values.actualHours} 学时`);
      setCompleteOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  async function handleCancel(id: string) {
    try {
      await api.updateAppointment(id, { status: 'cancelled' });
      message.success('已取消预约');
      loadData();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  const filteredAppointments = appointments.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (dateFilter && a.date !== dateFilter) return false;
    return true;
  }).sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110, sorter: (a, b) => a.date.localeCompare(b.date) },
    { title: '时段', key: 'time', width: 130, render: (_: any, r: Appointment) => `${r.startTime} - ${r.endTime}` },
    {
      title: '学员',
      dataIndex: 'studentId',
      key: 'studentId',
      render: (id: string) => {
        const s = students.find(x => x.id === id);
        return s ? (
          <span>
            {s.name}
            <Tag color="orange" style={{ marginLeft: 4 }}>剩{s.remainingHours}h</Tag>
          </span>
        ) : '-';
      }
    },
    {
      title: '教练',
      dataIndex: 'coachId',
      key: 'coachId',
      render: (id: string) => coaches.find(c => c.id === id)?.name || '-'
    },
    {
      title: '车辆',
      dataIndex: 'vehicleId',
      key: 'vehicleId',
      render: (id: string) => vehicles.find(v => v.id === id)?.plateNumber || '-'
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      render: (s: string) => SUBJECT_NAMES[s]
    },
    {
      title: '实际学时',
      dataIndex: 'actualHours',
      key: 'actualHours',
      render: (h: number, r: Appointment) => r.status === 'completed' ? `${h}h` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const color = s === 'booked' ? 'blue'
          : s === 'completed' ? 'green'
          : s === 'cancelled' ? 'default' : 'red';
        return <Tag color={color}>{APPOINTMENT_STATUS_NAMES[s]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: Appointment) => (
        <Space size="small">
          <Button type="link" onClick={() => handleDetail(record)}>详情</Button>
          {record.status === 'booked' && (
            <>
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleComplete(record)}
              >
                完成教学
              </Button>
              <Button
                type="link"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleCancel(record.id)}
              >
                取消
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">预约管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建预约
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker
          placeholder="选择日期"
          value={dateFilter ? dayjs(dateFilter) : null}
          onChange={(d) => setDateFilter(d ? d.format('YYYY-MM-DD') : undefined)}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 120 }}
          allowClear
        >
          {Object.entries(APPOINTMENT_STATUS_NAMES).map(([k, v]) => (
            <Option key={k} value={k}>{v}</Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredAppointments}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="新建教学预约"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={650}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="学员" name="studentId" rules={[{ required: true, message: '请选择学员' }]}>
                <Select
                  placeholder="选择学员"
                  showSearch
                  optionFilterProp="label"
                >
                  {students.filter(s => s.status === 'active' && s.remainingHours > 0).map(s => (
                    <Option key={s.id} value={s.id} label={s.name}>
                      {s.name} (剩余{s.remainingHours}h)
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="教学科目" name="subject" rules={[{ required: true, message: '请选择科目' }]}>
                <Select placeholder="选择科目">
                  {Object.entries(SUBJECT_NAMES).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="教练" name="coachId" rules={[{ required: true, message: '请选择教练' }]}>
                <Select placeholder="选择教练">
                  {coaches.filter(c => c.status === 'active').map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="车辆" name="vehicleId" rules={[{ required: true, message: '请选择车辆' }]}>
                <Select placeholder="选择车辆">
                  {vehicles.filter(v => v.status === 'available').map(v => (
                    <Option key={v.id} value={v.id}>{v.plateNumber} ({v.brand})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="教学日期" name="date" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="教学时段" name="timeRange" rules={[{ required: true, message: '请选择时段' }]}>
                <RangePicker format="HH:mm" style={{ width: '100%' }} minuteStep={30} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="关联排班(可选)" name="scheduleId">
            <Select placeholder="可关联至已审批排班" allowClear>
              {schedules.filter(s => s.status === 'approved').map(s => (
                <Option key={s.id} value={s.id}>
                  {s.date} {s.startTime}-{s.endTime} {coaches.find(c => c.id === s.coachId)?.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div className="form-actions">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" icon={<ClockCircleOutlined />}>
              确认预约并锁定资源
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="完成教学 - 记录学时"
        open={completeOpen}
        onCancel={() => setCompleteOpen(false)}
        footer={null}
        width={450}
      >
        {completingAppointment && (
          <Form form={completeForm} layout="vertical" onFinish={handleCompleteSubmit}>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="学员">
                {students.find(s => s.id === completingAppointment.studentId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="科目">{SUBJECT_NAMES[completingAppointment.subject]}</Descriptions.Item>
              <Descriptions.Item label="预约时段">
                {completingAppointment.date} {completingAppointment.startTime}-{completingAppointment.endTime}
              </Descriptions.Item>
            </Descriptions>
            <Form.Item
              label="实际教学学时(小时)"
              name="actualHours"
              rules={[{ required: true, message: '请输入实际学时' }]}
            >
              <InputNumber min={0.5} max={8} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <div className="form-actions">
              <Button onClick={() => setCompleteOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确认记录</Button>
            </div>
          </Form>
        )}
      </Modal>

      <Modal
        title="预约详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[<Button key="close" onClick={() => setDetailOpen(false)}>关闭</Button>]}
        width={500}
      >
        {detailAppointment && (
          <Descriptions column={1}>
            <Descriptions.Item label="日期">{detailAppointment.date}</Descriptions.Item>
            <Descriptions.Item label="时段">
              {detailAppointment.startTime} - {detailAppointment.endTime}
            </Descriptions.Item>
            <Descriptions.Item label="学员">
              {students.find(s => s.id === detailAppointment.studentId)?.name}
            </Descriptions.Item>
            <Descriptions.Item label="教练">
              {coaches.find(c => c.id === detailAppointment.coachId)?.name}
            </Descriptions.Item>
            <Descriptions.Item label="车辆">
              {vehicles.find(v => v.id === detailAppointment.vehicleId)?.plateNumber}
            </Descriptions.Item>
            <Descriptions.Item label="科目">{SUBJECT_NAMES[detailAppointment.subject]}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={detailAppointment.status === 'completed' ? 'green' : 'blue'}>
                {APPOINTMENT_STATUS_NAMES[detailAppointment.status]}
              </Tag>
            </Descriptions.Item>
            {detailAppointment.status === 'completed' && (
              <Descriptions.Item label="实际学时">{detailAppointment.actualHours} 小时</Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {dayjs(detailAppointment.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
