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
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, Vehicle, Coach } from '../services/api';
import { VEHICLE_STATUS_NAMES } from '../utils/validators';

const { Option } = Select;

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [vData, cData] = await Promise.all([api.getVehicles(), api.getCoaches()]);
      setVehicles(vData);
      setCoaches(cData);
    } catch (e: any) {
      message.error(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingVehicle(null);
    form.resetFields();
    setModalOpen(true);
  }

  function handleEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    form.setFieldsValue({
      ...vehicle,
      lastMaintenanceDate: vehicle.lastMaintenanceDate ? dayjs(vehicle.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: vehicle.nextMaintenanceDate ? dayjs(vehicle.nextMaintenanceDate) : undefined
    });
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteVehicle(id);
      message.success('删除成功');
      loadData();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  }

  async function handleSubmit(values: any) {
    try {
      const data = {
        ...values,
        lastMaintenanceDate: values.lastMaintenanceDate?.format('YYYY-MM-DD') || '',
        nextMaintenanceDate: values.nextMaintenanceDate?.format('YYYY-MM-DD') || ''
      };

      if (editingVehicle) {
        await api.updateVehicle(editingVehicle.id, data);
        message.success('修改成功');
      } else {
        await api.createVehicle(data);
        message.success('添加成功');
      }
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  }

  const filteredVehicles = vehicles.filter(v => {
    if (statusFilter && v.status !== statusFilter) return false;
    if (searchText) {
      const text = searchText.toLowerCase();
      return v.plateNumber.toLowerCase().includes(text) ||
        v.brand.toLowerCase().includes(text) ||
        v.model.toLowerCase().includes(text);
    }
    return true;
  });

  const columns = [
    {
      title: '车牌',
      dataIndex: 'plateNumber',
      key: 'plateNumber',
      render: (text: string) => (
        <Tag icon={<CarOutlined />} color="blue" style={{ fontSize: 14 }}>{text}</Tag>
      )
    },
    { title: '品牌', dataIndex: 'brand', key: 'brand' },
    { title: '型号', dataIndex: 'model', key: 'model' },
    { title: '年份', dataIndex: 'year', key: 'year' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => t === 'manual' ? '手动挡' : '自动挡'
    },
    {
      title: '当前教练',
      dataIndex: 'currentCoachId',
      key: 'currentCoachId',
      render: (id: string) => coaches.find(c => c.id === id)?.name || '-'
    },
    { title: '累计使用时长', dataIndex: 'totalUsageHours', key: 'totalUsageHours', render: (h: number) => `${h}小时` },
    { title: '上次保养', dataIndex: 'lastMaintenanceDate', key: 'lastMaintenanceDate' },
    { title: '下次保养', dataIndex: 'nextMaintenanceDate', key: 'nextMaintenanceDate' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const color = s === 'available' ? 'green'
          : s === 'in_use' ? 'blue'
          : s === 'maintenance' ? 'red' : 'orange';
        return <Tag color={color}>{VEHICLE_STATUS_NAMES[s]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Vehicle) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确定删除该车辆吗？"
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
        <h2 className="page-title">车辆管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加车辆</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索车牌号/品牌/型号"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 120 }}
          allowClear
        >
          {Object.entries(VEHICLE_STATUS_NAMES).map(([k, v]) => (
            <Option key={k} value={k}>{v}</Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredVehicles}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingVehicle ? '编辑车辆' : '添加车辆'}
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
            status: 'available',
            type: 'manual',
            totalUsageHours: 0
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="车牌号" name="plateNumber" rules={[{ required: true, message: '请输入车牌号' }]}>
                <Input placeholder="如：京A·12345" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="车辆类型" name="type" rules={[{ required: true, message: '请选择车辆类型' }]}>
                <Select>
                  <Option value="manual">手动挡</Option>
                  <Option value="automatic">自动挡</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="品牌" name="brand" rules={[{ required: true, message: '请输入品牌' }]}>
                <Input placeholder="如：大众" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="型号" name="model" rules={[{ required: true, message: '请输入型号' }]}>
                <Input placeholder="如：桑塔纳" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="年份" name="year" rules={[{ required: true, message: '请输入年份' }]}>
                <InputNumber min={2010} max={2030} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="当前分配教练" name="currentCoachId">
                <Select placeholder="请选择教练" allowClear>
                  {coaches.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
                <Select>
                  {Object.entries(VEHICLE_STATUS_NAMES).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="上次保养日期" name="lastMaintenanceDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="下次保养日期" name="nextMaintenanceDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <div className="form-actions">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              {editingVehicle ? '保存修改' : '添加'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
