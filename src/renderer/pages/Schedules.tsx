import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  Tag,
  message,
  Popconfirm,
  Space,
  Card,
  Row,
  Col,
  Transfer,
  Tabs,
  Input
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  SwapOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, Schedule, Coach, Vehicle, Student, SwapRequest } from '../services/api';
import { SCHEDULE_STATUS_NAMES, COACH_LEVEL_NAMES } from '../utils/validators';

const { Option } = Select;
const { RangePicker } = TimePicker;

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [dateFilter, setDateFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [targetStudents, setTargetStudents] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [swapForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [sData, cData, vData, stData, swData] = await Promise.all([
        api.getSchedules(),
        api.getCoaches(),
        api.getVehicles(),
        api.getStudents(),
        api.getSwapRequests()
      ]);
      setSchedules(sData);
      setCoaches(cData);
      setVehicles(vData);
      setStudents(stData);
      setSwapRequests(swData);
    } catch (e: any) {
      message.error(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingSchedule(null);
    setTargetStudents([]);
    form.resetFields();
    setModalOpen(true);
  }

  function handleEdit(schedule: Schedule) {
    setEditingSchedule(schedule);
    setTargetStudents(schedule.studentIds);
    form.setFieldsValue({
      ...schedule,
      date: dayjs(schedule.date),
      timeRange: [dayjs(schedule.startTime, 'HH:mm'), dayjs(schedule.endTime, 'HH:mm')]
    });
    setModalOpen(true);
  }

  async function handleGenerate() {
    if (!dateFilter) {
      message.warning('请先选择排班日期');
      return;
    }
    try {
      const result = await api.generateSchedules(dateFilter);
      message.success(`成功生成 ${result.length} 条排班，请审批`);
      loadData();
    } catch (e: any) {
      message.error(e.message || '生成排班失败');
    }
  }

  async function handleApprove(id: string) {
    try {
      await api.updateSchedule(id, { status: 'approved' });
      message.success('审批通过');
      loadData();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  async function handleReject(id: string) {
    try {
      await api.updateSchedule(id, { status: 'rejected' });
      message.success('已驳回');
      loadData();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  async function handleSubmit(values: any) {
    try {
      const data = {
        date: values.date.format('YYYY-MM-DD'),
        coachId: values.coachId,
        vehicleId: values.vehicleId,
        startTime: values.timeRange[0].format('HH:mm'),
        endTime: values.timeRange[1].format('HH:mm'),
        studentIds: targetStudents,
        status: 'pending',
        notes: values.notes || ''
      };

      if (editingSchedule) {
        await api.updateSchedule(editingSchedule.id, data);
        message.success('修改成功');
      } else {
        await api.createSchedule(data);
        message.success('创建成功');
      }
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  }

  function handleRequestSwap(schedule: Schedule) {
    setSelectedSchedule(schedule);
    swapForm.resetFields();
    setSwapModalOpen(true);
  }

  async function handleSwapSubmit(values: any) {
    if (!selectedSchedule) return;
    try {
      await api.createSwapRequest({
        scheduleId: selectedSchedule.id,
        fromCoachId: selectedSchedule.coachId,
        toCoachId: values.toCoachId || null,
        reason: values.reason
      });
      message.success('调换申请已提交，等待审批');
      setSwapModalOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e.message || '提交失败');
    }
  }

  async function handleApproveSwap(id: string) {
    try {
      await api.approveSwapRequest(id);
      message.success('调换审批通过');
      loadData();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  async function handleRejectSwap(id: string) {
    try {
      await api.rejectSwapRequest(id);
      message.success('已驳回调换申请');
      loadData();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  const filteredSchedules = schedules.filter(s => {
    if (dateFilter && s.date !== dateFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  const studentDataSource = students
    .filter(s => s.status === 'active' && s.remainingHours > 0)
    .map(s => ({ key: s.id, title: `${s.name} (剩余${s.remainingHours}h)` }));

  const scheduleColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '时段', key: 'time', width: 130, render: (_: any, r: Schedule) => `${r.startTime} - ${r.endTime}` },
    {
      title: '教练',
      dataIndex: 'coachId',
      key: 'coachId',
      render: (id: string) => {
        const c = coaches.find(x => x.id === id);
        return c ? (
          <span>
            {c.name}
            <Tag color="blue" style={{ marginLeft: 4 }}>{COACH_LEVEL_NAMES[c.level]}</Tag>
          </span>
        ) : '-';
      }
    },
    {
      title: '车辆',
      dataIndex: 'vehicleId',
      key: 'vehicleId',
      render: (id: string) => vehicles.find(v => v.id === id)?.plateNumber || '-'
    },
    {
      title: '学员',
      dataIndex: 'studentIds',
      key: 'studentIds',
      render: (ids: string[]) => ids.map(id => students.find(s => s.id === id)?.name).filter(Boolean).join('、') || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const color = s === 'approved' ? 'green'
          : s === 'pending' ? 'orange'
          : s === 'rejected' ? 'red' : 'blue';
        return <Tag color={color}>{SCHEDULE_STATUS_NAMES[s]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: any, record: Schedule) => (
        <Space size="small">
          {record.status === 'pending' && (
            <>
              <Button type="link" icon={<CheckOutlined />} onClick={() => handleApprove(record.id)}>
                通过
              </Button>
              <Button type="link" danger icon={<CloseOutlined />} onClick={() => handleReject(record.id)}>
                驳回
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button type="link" icon={<SwapOutlined />} onClick={() => handleRequestSwap(record)}>
              申请调换
            </Button>
          )}
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
        </Space>
      )
    }
  ];

  const swapColumns = [
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '排班日期',
      key: 'scheduleDate',
      render: (_: any, r: SwapRequest) => schedules.find(s => s.id === r.scheduleId)?.date || '-'
    },
    {
      title: '原教练',
      dataIndex: 'fromCoachId',
      key: 'fromCoachId',
      render: (id: string) => coaches.find(c => c.id === id)?.name || '-'
    },
    {
      title: '调换教练',
      dataIndex: 'toCoachId',
      key: 'toCoachId',
      render: (id: string) => id ? (coaches.find(c => c.id === id)?.name || '-') : '待定'
    },
    { title: '原因', dataIndex: 'reason', key: 'reason' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const color = s === 'approved' ? 'green' : s === 'pending' ? 'orange' : 'red';
        return <Tag color={color}>{s === 'approved' ? '已通过' : s === 'pending' ? '待审批' : '已驳回'}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: SwapRequest) => record.status === 'pending' && (
        <Space>
          <Button type="link" icon={<CheckOutlined />} onClick={() => handleApproveSwap(record.id)}>通过</Button>
          <Button type="link" danger icon={<CloseOutlined />} onClick={() => handleRejectSwap(record.id)}>驳回</Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">智能排班管理</h2>
        <Space>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleGenerate}
          >
            AI自动排班
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleAdd}>
            手动排班
          </Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'schedule',
            label: <span><CalendarOutlined /> 排班列表</span>,
            children: (
              <>
                <Space style={{ marginBottom: 16 }} wrap>
                  <DatePicker
                    placeholder="选择排班日期"
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
                    {Object.entries(SCHEDULE_STATUS_NAMES).map(([k, v]) => (
                      <Option key={k} value={k}>{v}</Option>
                    ))}
                  </Select>
                </Space>

                <Table
                  columns={scheduleColumns}
                  dataSource={filteredSchedules}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </>
            )
          },
          {
            key: 'swap',
            label: <span><SwapOutlined /> 调换申请 ({swapRequests.filter(r => r.status === 'pending').length})</span>,
            children: (
              <Table
                columns={swapColumns}
                dataSource={swapRequests}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            )
          },
          {
            key: 'calendar',
            label: <span>📅 排班热力图</span>,
            children: <HeatmapView schedules={schedules} coaches={coaches} vehicles={vehicles} />
          }
        ]}
      />

      <Modal
        title={editingSchedule ? '编辑排班' : '新建排班'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: 'pending' }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="排班日期" name="date" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="教学时段" name="timeRange" rules={[{ required: true, message: '请选择时段' }]}>
                <RangePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="教练" name="coachId" rules={[{ required: true, message: '请选择教练' }]}>
                <Select placeholder="请选择教练">
                  {coaches.filter(c => c.status === 'active').map(c => (
                    <Option key={c.id} value={c.id}>
                      {c.name} ({COACH_LEVEL_NAMES[c.level]})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="车辆" name="vehicleId" rules={[{ required: true, message: '请选择车辆' }]}>
                <Select placeholder="请选择车辆">
                  {vehicles.filter(v => v.status === 'available').map(v => (
                    <Option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.brand} {v.model})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="安排学员">
            <Transfer
              dataSource={studentDataSource}
              targetKeys={targetStudents}
              onChange={setTargetStudents}
              render={item => item.title}
              listStyle={{ width: '100%', minHeight: 150 }}
              titles={['可选学员', '已选学员']}
            />
          </Form.Item>

          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>

          <div className="form-actions">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              {editingSchedule ? '保存修改' : '提交审批'}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="申请排班调换"
        open={swapModalOpen}
        onCancel={() => setSwapModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={swapForm} layout="vertical" onFinish={handleSwapSubmit}>
          <Form.Item label="调换目标教练" name="toCoachId">
            <Select placeholder="可选，留空表示待定" allowClear>
              {coaches.filter(c => c.status === 'active' && c.id !== selectedSchedule?.coachId).map(c => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="调换原因" name="reason" rules={[{ required: true, message: '请输入调换原因' }]}>
            <Input.TextArea rows={4} placeholder="请详细说明调换原因" />
          </Form.Item>
          <div className="form-actions">
            <Button onClick={() => setSwapModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">提交申请</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

function HeatmapView({ schedules, coaches, vehicles }: {
  schedules: Schedule[];
  coaches: Coach[];
  vehicles: Vehicle[];
}) {
  const [weekStart, setWeekStart] = useState(dayjs().startOf('week'));

  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const timeSlots = ['08:00-12:00', '13:00-17:00'];

  function getIntensity(date: string, coachId: string, slot: string): number {
    const [start, end] = slot.split('-');
    const schedule = schedules.find(s =>
      s.date === date &&
      s.coachId === coachId &&
      s.startTime === start &&
      s.endTime === end &&
      s.status !== 'rejected'
    );
    if (!schedule) return 0;
    return schedule.studentIds.length / 2;
  }

  function getColor(intensity: number): string {
    if (intensity === 0) return '#f5f5f5';
    if (intensity <= 0.5) return '#bae7ff';
    if (intensity <= 1) return '#69c0ff';
    return '#1890ff';
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => setWeekStart(weekStart.subtract(1, 'week'))}>上一周</Button>
        <span style={{ fontWeight: 600 }}>
          {weekStart.format('YYYY-MM-DD')} ~ {weekStart.add(6, 'day').format('YYYY-MM-DD')}
        </span>
        <Button onClick={() => setWeekStart(weekStart.add(1, 'week'))}>下一周</Button>
        <Button onClick={() => setWeekStart(dayjs().startOf('week'))}>本周</Button>
      </Space>

      <Card>
        <Row gutter={[8, 8]}>
          <Col span={3}></Col>
          {days.map(d => (
            <Col key={d.format('YYYY-MM-DD')} span={3} style={{ textAlign: 'center', fontWeight: 600 }}>
              {d.format('MM-DD')}<br />
              <span style={{ color: '#999', fontWeight: 'normal', fontSize: 12 }}>
                {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.day()]}
              </span>
            </Col>
          ))}

          {coaches.filter(c => c.status === 'active').flatMap(coach =>
            timeSlots.map((slot, si) => {
              const labelCol = (
                <Col key={`${coach.id}-label-${slot}`} span={3} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                  fontSize: si === 0 ? 14 : 12,
                  color: si === 0 ? '#000' : '#666'
                }}>
                  {si === 0 ? coach.name : slot}
                </Col>
              );
              const dayCols = days.map(d => {
                const dateStr = d.format('YYYY-MM-DD');
                const intensity = getIntensity(dateStr, coach.id, slot);
                const schedule = schedules.find(s =>
                  s.date === dateStr &&
                  s.coachId === coach.id &&
                  s.startTime === slot.split('-')[0] &&
                  s.endTime === slot.split('-')[1]
                );
                return (
                  <Col key={`${coach.id}-${dateStr}-${slot}`} span={3}>
                    <div
                      className="heatmap-cell"
                      style={{
                        backgroundColor: getColor(intensity),
                        color: intensity > 0.5 ? '#fff' : '#333',
                        cursor: schedule ? 'pointer' : 'default'
                      }}
                      title={schedule ? `${vehicles.find(v => v.id === schedule.vehicleId)?.plateNumber || ''} 学员:${schedule.studentIds.length}人` : '空闲'}
                    >
                      {schedule ? `${schedule.studentIds.length}人` : '-'}
                    </div>
                  </Col>
                );
              });
              return [labelCol, ...dayCols];
            })
          )}
        </Row>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>忙闲程度：</span>
          {[
            { c: '#f5f5f5', l: '空闲' },
            { c: '#bae7ff', l: '低负荷' },
            { c: '#69c0ff', l: '正常' },
            { c: '#1890ff', l: '满负荷' }
          ].map(item => (
            <span key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 20, background: item.c, border: '1px solid #ddd' }}></div>
              {item.l}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
