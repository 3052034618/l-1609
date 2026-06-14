import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  DatePicker,
  InputNumber,
  Tag,
  message,
  Popconfirm,
  Avatar,
  Space,
  Progress,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  UploadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { api, Student } from '../services/api';
import {
  isValidIdCard,
  parseIdCardBirthDate,
  calculateAge,
  validateAge,
  validatePhoto,
  validateExistingPhoto,
  SUBJECT_NAMES,
  STUDENT_STATUS_NAMES
} from '../utils/validators';

const { Option } = Select;
const { TextArea } = Input;

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoError, setPhotoError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    try {
      const data = await api.getStudents();
      setStudents(data);
    } catch (e: any) {
      message.error(e.message || '加载学员列表失败');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingStudent(null);
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoError('');
    form.resetFields();
    setModalOpen(true);
  }

  function handleEdit(student: Student) {
    setEditingStudent(student);
    setPhotoPreview(student.photo || '');
    setPhotoFile(null);
    setPhotoError('');
    form.setFieldsValue({
      ...student,
      gender: student.gender
    });
    setModalOpen(true);
  }

  function handleDetail(student: Student) {
    setDetailStudent(student);
    setDetailOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteStudent(id);
      message.success('删除成功');
      loadStudents();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  }

  function handleIdCardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const idCard = e.target.value;
    const result = isValidIdCard(idCard);
    if (result.valid) {
      const birthDate = parseIdCardBirthDate(idCard);
      const age = calculateAge(birthDate);
      form.setFieldsValue({ birthDate, age });
      const ageResult = validateAge(age);
      if (!ageResult.valid) {
        message.warning(ageResult.message);
      }
    }
  }

  const uploadProps: UploadProps = {
    beforeUpload: async (file) => {
      const result = await validatePhoto(file, { required: true });
      if (!result.valid) {
        setPhotoError(result.message);
        message.error(result.message);
        return Upload.LIST_IGNORE;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoError('');
      return false;
    },
    showUploadList: false,
    accept: 'image/jpeg,image/png,image/gif,image/bmp,image/webp'
  };

  async function handleSubmit(values: any) {
    if (submitting) return;
    try {
      let photoData = photoPreview;

      if (photoFile) {
        const fileCheck = await validatePhoto(photoFile, { required: true });
        if (!fileCheck.valid) {
          setPhotoError(fileCheck.message);
          message.error(fileCheck.message);
          return;
        }
        const reader = new FileReader();
        photoData = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(photoFile);
        });
      }

      if (editingStudent) {
        if (!photoData) {
          const existingCheck = validateExistingPhoto(editingStudent.photo, { required: true });
          if (!existingCheck.valid) {
            setPhotoError(existingCheck.message);
            message.error(existingCheck.message);
            return;
          }
          photoData = editingStudent.photo;
        }
      } else {
        if (!photoData) {
          setPhotoError('请上传学员照片，照片为必填项（未上传或上传校验未通过）');
          message.error('请上传学员照片，照片为必填项');
          return;
        }
      }

      const finalPhotoCheck = validateExistingPhoto(photoData, { required: true });
      if (!finalPhotoCheck.valid) {
        setPhotoError(finalPhotoCheck.message);
        message.error(finalPhotoCheck.message);
        return;
      }
      setPhotoError('');

      setSubmitting(true);
      const data = {
        ...values,
        photo: photoData,
        enrollDate: values.enrollDate?.format('YYYY-MM-DD') || new Date().toISOString().split('T')[0]
      };

      if (editingStudent) {
        await api.updateStudent(editingStudent.id, data);
        message.success('修改成功');
      } else {
        await api.createStudent(data);
        message.success('报名成功');
      }
      setModalOpen(false);
      loadStudents();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredStudents = students.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (searchText) {
      const text = searchText.toLowerCase();
      return s.name.toLowerCase().includes(text) ||
        s.idCard.includes(text) ||
        s.phone.includes(text);
    }
    return true;
  });

  const columns = [
    {
      title: '照片',
      dataIndex: 'photo',
      key: 'photo',
      width: 60,
      render: (photo: string) => (
        <Avatar src={photo} icon={<UserOutlined />} size={40} />
      )
    },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (g: string) => g === 'male' ? '男' : '女'
    },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 60 },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard', width: 180 },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 120 },
    {
      title: '当前科目',
      dataIndex: 'currentSubject',
      key: 'currentSubject',
      render: (s: string) => SUBJECT_NAMES[s]
    },
    {
      title: '学习进度',
      key: 'progress',
      width: 180,
      render: (_: any, r: Student) => (
        <Progress
          percent={Math.round((r.completedHours / r.totalHours) * 100)}
          size="small"
        />
      )
    },
    {
      title: '剩余学时',
      key: 'remaining',
      render: (_: any, r: Student) => `${r.remainingHours}/${r.totalHours}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const color = s === 'active' ? 'green'
          : s === 'suspended' ? 'orange'
          : s === 'completed' ? 'blue' : 'red';
        return <Tag color={color}>{STUDENT_STATUS_NAMES[s]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: Student) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleDetail(record)}>
            详情
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该学员吗？"
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
        <h2 className="page-title">学员管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          学员报名
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索姓名/身份证/电话"
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
          style={{ width: 150 }}
          allowClear
        >
          {Object.entries(STUDENT_STATUS_NAMES).map(([k, v]) => (
            <Option key={k} value={k}>{v}</Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredStudents}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingStudent ? '编辑学员信息' : '学员报名登记'}
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
          initialValues={{
            status: 'active',
            totalHours: 62,
            currentSubject: 'subject1'
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="性别"
                name="gender"
                rules={[{ required: true, message: '请选择性别' }]}
              >
                <Select placeholder="请选择性别">
                  <Option value="male">男</Option>
                  <Option value="female">女</Option>
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
                <Input
                  placeholder="请输入18位身份证号"
                  maxLength={18}
                  onChange={handleIdCardChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="联系电话" name="phone" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input placeholder="请输入手机号码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="出生日期"
                name="birthDate"
                rules={[{ required: true, message: '请输入出生日期' }]}
              >
                <Input disabled placeholder="由身份证自动解析" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="年龄"
                name="age"
                rules={[
                  { required: true, message: '年龄必须在18-70周岁之间' },
                  {
                    validator: (_rule, value) => {
                      if (!value) return Promise.resolve();
                      const result = validateAge(value);
                      if (!result.valid) return Promise.reject(result.message);
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber disabled style={{ width: '100%' }} placeholder="由身份证自动计算" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="学员照片"
            name="photo"
            required
            help={
              <span style={{ color: photoError ? '#ff4d4f' : undefined }}>
                {photoError || '支持JPG/PNG/GIF/BMP/WEBP，必须300×400像素以上，不超过5MB，建议竖版证件照'}
              </span>
            }
            validateStatus={photoError ? 'error' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar
                src={photoPreview}
                icon={<UserOutlined />}
                size={80}
                style={{
                  border: photoError ? '2px solid #ff4d4f' : '1px solid #ddd',
                  backgroundColor: photoPreview ? 'transparent' : '#f5f5f5'
                }}
              />
              <Space direction="vertical" size="small">
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />} type={photoError ? 'primary' : 'default'} danger={!!photoError}>
                    {photoPreview ? '重新上传照片' : '上传照片 *'}
                  </Button>
                </Upload>
                {editingStudent && !photoFile && (
                  <span style={{ color: '#52c41a', fontSize: 12 }}>
                    ✓ 已保存照片，可正常提交（如需更换请点击重新上传）
                  </span>
                )}
              </Space>
            </div>
          </Form.Item>

          <Form.Item label="家庭住址" name="address">
            <Input placeholder="请输入家庭住址" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="总学时"
                name="totalHours"
                rules={[{ required: true, message: '请输入总学时' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="当前科目" name="currentSubject">
                <Select>
                  {Object.entries(SUBJECT_NAMES).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="状态" name="status">
                <Select>
                  {Object.entries(STUDENT_STATUS_NAMES).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="备注" name="notes">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>

          <div className="form-actions">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              {editingStudent ? '保存修改' : '提交报名'}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="学员详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[<Button key="close" onClick={() => setDetailOpen(false)}>关闭</Button>]}
        width={600}
      >
        {detailStudent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <Avatar
                src={detailStudent.photo}
                icon={<UserOutlined />}
                size={80}
                style={{ marginRight: 20 }}
              />
              <div>
                <h3 style={{ margin: 0 }}>{detailStudent.name}</h3>
                <p style={{ margin: '8px 0 0 0', color: '#666' }}>
                  {detailStudent.gender === 'male' ? '男' : '女'} · {detailStudent.age}岁 · {detailStudent.phone}
                </p>
                <Tag
                  color={detailStudent.status === 'active' ? 'green' : 'orange'}
                  style={{ marginTop: 8 }}
                >
                  {STUDENT_STATUS_NAMES[detailStudent.status]}
                </Tag>
              </div>
            </div>

            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}><strong>身份证号：</strong>{detailStudent.idCard}</Col>
              <Col span={12}><strong>出生日期：</strong>{detailStudent.birthDate}</Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}><strong>报名日期：</strong>{detailStudent.enrollDate}</Col>
              <Col span={12}><strong>当前科目：</strong>{SUBJECT_NAMES[detailStudent.currentSubject]}</Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={24}><strong>家庭住址：</strong>{detailStudent.address || '-'}</Col>
            </Row>

            <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 20 }}>
              <h4>学时情况</h4>
              <div style={{ marginBottom: 8 }}>
                总体进度：
                <Progress
                  percent={Math.round((detailStudent.completedHours / detailStudent.totalHours) * 100)}
                />
              </div>
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ color: '#666' }}>科目一</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{detailStudent.subject1Hours}h</div>
                </Col>
                <Col span={6}>
                  <div style={{ color: '#666' }}>科目二</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{detailStudent.subject2Hours}h</div>
                </Col>
                <Col span={6}>
                  <div style={{ color: '#666' }}>科目三</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{detailStudent.subject3Hours}h</div>
                </Col>
                <Col span={6}>
                  <div style={{ color: '#666' }}>科目四</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{detailStudent.subject4Hours}h</div>
                </Col>
              </Row>
              <div style={{ marginTop: 12 }}>
                已完成：<strong>{detailStudent.completedHours}</strong> 小时 /
                剩余：<strong style={{ color: '#faad14' }}>{detailStudent.remainingHours}</strong> 小时 /
                总计：<strong>{detailStudent.totalHours}</strong> 小时
              </div>
              {detailStudent.lastStudyDate && (
                <div style={{ marginTop: 8, color: '#666' }}>
                  最近学习日期：{detailStudent.lastStudyDate}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
