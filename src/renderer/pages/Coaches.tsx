import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Tag,
  message,
  Popconfirm,
  Space,
  Checkbox,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, Coach } from '../services/api';
import { COACH_LEVEL_NAMES, isValidIdCard } from '../utils/validators';

const { Option } = Select;
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function Coaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    setLoading(true);
    try {
      const data = await api.getCoaches();
      setCoaches(data);
    } catch (e: any) {
      message.error(e.message || '加载教练列表失败');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingCoach(null);
    form.resetFields();
    setModalOpen(true);
  }

  function handleEdit(coach: Coach) {
    setEditingCoach(coach);
    form.setFieldsValue({
      ...coach,
      hireDate: coach.hireDate ? dayjs(coach.hireDate) : undefined,
      weeklySchedule: coach.weeklySchedule
        ? coach.weeklySchedule.map((v, i) => v === 1 ? i : -1).filter(i => i >= 0)
        : []
    });
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteCoach(id);
      message.success('删除成功');
      loadCoaches();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  }

  async function handleSubmit(values: any) {
    try {
      const weeklySchedule = [0, 0, 0, 0, 0, 0, 0];
      (values.weeklySchedule || []).forEach((i: number) => {
        weeklySchedule[i] = 1;
      });

      const data = {
        ...values,
        weeklySchedule,
        hireDate: values.hireDate?.format('YYYY-MM-DD') || new Date().toISOString().split('T')[0]
      };
      delete data.hireDateDayjs;

      if (editingCoach) {
        await api.updateCoach(editingCoach.id, data);
        message.success('修改成功');
      } else {
        await api.createCoach(data);
        message.success('添加成功');
      }
      setModalOpen(false);
      loadCoaches();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  }

  const filteredCoaches = coaches.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (searchText) {
      const text = searchText.toLowerCase();
      return c.name.toLowerCase().includes(text) ||
        c.idCard.includes(text) ||
        c.phone.includes(text) ||
        c.licenseNumber.toLowerCase().includes(text);
    }
    return true;
  });

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '资质等级',
      dataIndex: 'level',
      key: 'level',
      render: (l: string) => {
        const color = l === 'master' ? 'gold'
          : l === 'senior' ? 'purple'
          : l === 'intermediate' ? 'blue' : 'green';
        return <Tag color={color}>{COACH_LEVEL_NAMES[l]}</Tag>;
      }
    },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard', width: 180 },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '教练证号', dataIndex: 'licenseNumber', key: 'licenseNumber' },
    { title: '入职日期', dataIndex: 'hireDate', key: 'hireDate' },
    { title: '日最大工时', dataIndex: 'maxDailyHours', key: 'maxDailyHours', render: (v: number) => `${v}小时` },
    {
      title: '工作排班',
      dataIndex: 'weeklySchedule',
      key: 'weeklySchedule',
      render: (schedule: number[]) => WEEKDAYS.filter((_, i) => schedule[i] === 1).join('、') || '未设置'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'active' ? 'green' : s === 'leave' ? 'orange' : 'red'}>
          {s === 'active' ? '在岗' : s === 'leave' ? '休假' : '停用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Coach) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确定删除该教练吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">教练管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加教练</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索姓名/身份证/电话/教练证号"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 280 }}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 120 }}
          allowClear
        >
          <Option value="active">在岗</Option>
          <Option value="leave">休假</Option>
          <Option value="inactive">停用</Option>
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredCoaches}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingCoach ? '编辑教练' : '添加教练'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'active',
            level: 'junior',
            maxDailyHours: 8,
            weeklySchedule: [0, 1, 2, 3, 4]
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="资质等级" name="level" rules={[{ required: true, message: '请选择资质等级' }]}>
                <Select>
                  {Object.entries(COACH_LEVEL_NAMES).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="身份证号"
                name="idCard"
                rules={[
                  { required: true, message: '请输入身份证号' },
                  {
                    validator: (_rule, value) => {
                      if (!value) return Promise.resolve();
                      const result = isValidIdCard(value);
                      if (!result.valid) return Promise.reject(result.message);
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input placeholder="请输入身份证号" maxLength={18} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="联系电话" name="phone" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="教练证号" name="licenseNumber" rules={[{ required: true, message: '请输入教练证号' }]}>
                <Input placeholder="请输入教练证号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="入职日期" name="hireDate" rules={[{ required: true, message: '请选择入职日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="日最大工时(小时)" name="maxDailyHours" rules={[{ required: true, message: '请输入日最大工时' }]}>
                <InputNumber min={1} max={12} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="状态" name="status">
                <Select>
                  <Option value="active">在岗</Option>
                  <Option value="leave">休假</Option>
                  <Option value="inactive">停用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="每周工作日" name="weeklySchedule">
            <Checkbox.Group>
              {WEEKDAYS.map((day, i) => (
                <Checkbox key={i} value={i}>{day}</Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>

          <div className="form-actions">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              {editingCoach ? '保存修改' : '添加'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
