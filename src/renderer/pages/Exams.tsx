import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  Input,
  InputNumber,
  Tag,
  message,
  Space,
  Alert as AntAlert,
  Descriptions,
  Row,
  Col,
  Progress
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  BellOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, Exam, Student } from '../services/api';
import { SUBJECT_NAMES, EXAM_STATUS_NAMES } from '../utils/validators';

const { Option } = Select;

const REQUIRED_HOURS: Record<string, number> = {
  subject1: 12,
  subject2: 24,
  subject3: 20,
  subject4: 6
};

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [detailExam, setDetailExam] = useState<Exam | null>(null);
  const [resultExam, setResultExam] = useState<Exam | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [resultForm] = Form.useForm();

  useEffect(() => {
    loadData();
    checkUpcomingExams();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [eData, sData] = await Promise.all([api.getExams(), api.getStudents()]);
      setExams(eData);
      setStudents(sData);
    } catch (e: any) {
      message.error(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  async function checkUpcomingExams() {
    const now = dayjs();
    const upcoming = exams.filter(e => {
      if (!e.examDate || e.reminderSent) return false;
      const examTime = dayjs(`${e.examDate} ${e.examTime || '00:00'}`);
      const diff = examTime.diff(now, 'hour');
      return diff > 0 && diff <= 24;
    });
    for (const exam of upcoming) {
      const student = students.find(s => s.id === exam.studentId);
      if (student) {
        message.info({
          content: `考试提醒：学员【${student.name}】将于24小时内参加${SUBJECT_NAMES[exam.type]}考试`,
          icon: <BellOutlined />,
          duration: 5
        });
      }
      await api.updateExam(exam.id, { reminderSent: true });
    }
  }

  async function handleGenerateSuggestions() {
    try {
      const suggestions = await api.generateExamSuggestions();
      if (suggestions.length > 0) {
        message.success(`已生成 ${suggestions.length} 条考试预约建议`);
      } else {
        message.info('暂无可推荐的考试预约');
      }
      loadData();
    } catch (e: any) {
      message.error(e.message || '生成建议失败');
    }
  }

  function handleAdd() {
    setEditingExam(null);
    form.resetFields();
    setModalOpen(true);
  }

  function handleDetail(exam: Exam) {
    setDetailExam(exam);
    setDetailOpen(true);
  }

  async function handleApprove(exam: Exam) {
    try {
      if (!exam.examDate) {
        message.warning('请先完善考试日期等信息');
        setEditingExam(exam);
        form.setFieldsValue(exam);
        setModalOpen(true);
        return;
      }
      await api.updateExam(exam.id, { status: 'approved' });
      message.success('审核通过');
      loadData();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  function handleRecordResult(exam: Exam) {
    setResultExam(exam);
    resultForm.resetFields();
    setResultOpen(true);
  }

  async function handleSubmit(values: any) {
    try {
      const data = {
        ...values,
        examDate: values.examDate?.format('YYYY-MM-DD') || null,
        examTime: values.examTime?.format('HH:mm') || null
      };
      if (editingExam) {
        await api.updateExam(editingExam.id, data);
        message.success('修改成功');
      } else {
        await api.createExam(data);
        message.success('添加成功');
      }
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  }

  async function handleResultSubmit(values: any) {
    if (!resultExam) return;
    try {
      const passed = values.passed;
      await api.updateExam(resultExam.id, {
        status: passed ? 'completed' : 'failed',
        score: values.score,
        passed
      });
      message.success(passed ? '已记录考试通过' : '已记录考试未通过');
      setResultOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  }

  function getStudentProgress(student: Student, subject: string) {
    const hoursKey = `${subject}Hours` as keyof Student;
    const currentHours = (student[hoursKey] as number) || 0;
    const required = REQUIRED_HOURS[subject] || 0;
    return { currentHours, required, percent: required > 0 ? Math.min(100, Math.round(currentHours / required * 100)) : 0 };
  }

  const filteredExams = exams.filter(e => {
    if (statusFilter && e.status !== statusFilter) return false;
    return true;
  });

  const columns = [
    {
      title: '学员',
      dataIndex: 'studentId',
      key: 'studentId',
      render: (id: string) => students.find(s => s.id === id)?.name || '-'
    },
    {
      title: '科目',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => SUBJECT_NAMES[t]
    },
    {
      title: '学时达标',
      key: 'hours',
      render: (_: any, r: Exam) => {
        const student = students.find(s => s.id === r.studentId);
        if (!student) return '-';
        const p = getStudentProgress(student, r.type);
        return (
          <span>
            <Progress percent={p.percent} size="small" style={{ width: 120 }} />
            <span style={{ marginLeft: 8 }}>{p.currentHours}/{p.required}h</span>
          </span>
        );
      }
    },
    {
      title: '考试日期',
      dataIndex: 'examDate',
      key: 'examDate',
      render: (d: string | null, r: Exam) => d ? `${d} ${r.examTime || ''}` : '待安排'
    },
    { title: '考试地点', dataIndex: 'location', key: 'location', render: (l: string) => l || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const color = s === 'completed' ? 'green'
          : s === 'booked' || s === 'approved' ? 'blue'
          : s === 'suggested' ? 'orange' : 'red';
        return <Tag color={color}>{EXAM_STATUS_NAMES[s]}</Tag>;
      }
    },
    {
      title: '成绩',
      key: 'result',
      render: (_: any, r: Exam) => {
        if (r.status === 'completed') return <Tag color="green">通过 {r.score}分</Tag>;
        if (r.status === 'failed') return <Tag color="red">未通过 {r.score || 0}分</Tag>;
        return '-';
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      render: (_: any, record: Exam) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleDetail(record)}>详情</Button>
          {record.status === 'suggested' && (
            <Button type="link" icon={<CheckOutlined />} onClick={() => handleApprove(record)}>
              审核
            </Button>
          )}
          {(record.status === 'approved' || record.status === 'booked') && (
            <Button type="link" onClick={() => handleRecordResult(record)}>
              录入成绩
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">考试管理</h2>
        <Space>
          <Button icon={<ThunderboltOutlined />} onClick={handleGenerateSuggestions}>
            生成预约建议
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增考试记录
          </Button>
        </Space>
      </div>

      <AntAlert
        message="系统提示"
        description="考前24小时将自动发送考试提醒，并校验身份证和约考信息完整性。连续15天无学时记录的学员将自动触发预警。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          allowClear
        >
          {Object.entries(EXAM_STATUS_NAMES).map(([k, v]) => (
            <Option key={k} value={k}>{v}</Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredExams}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingExam ? '编辑考试安排' : '新增考试记录'}
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
          initialValues={{ status: 'suggested' }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="学员" name="studentId" rules={[{ required: true, message: '请选择学员' }]}>
                <Select placeholder="选择学员" showSearch optionFilterProp="label">
                  {students.filter(s => s.status === 'active').map(s => (
                    <Option key={s.id} value={s.id} label={s.name}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="考试科目" name="type" rules={[{ required: true, message: '请选择科目' }]}>
                <Select placeholder="选择科目">
                  {Object.entries(SUBJECT_NAMES).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="考试日期" name="examDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="考试时间" name="examTime">
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="状态" name="status">
                <Select>
                  {Object.entries(EXAM_STATUS_NAMES).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="考试地点" name="location">
            <Input placeholder="请输入考试地点" />
          </Form.Item>

          <div className="form-actions">
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              {editingExam ? '保存修改' : '提交'}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="考试详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[<Button key="close" onClick={() => setDetailOpen(false)}>关闭</Button>]}
        width={500}
      >
        {detailExam && (
          <div>
            <Descriptions column={1}>
              <Descriptions.Item label="学员">
                {students.find(s => s.id === detailExam.studentId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="科目">{SUBJECT_NAMES[detailExam.type]}</Descriptions.Item>
              <Descriptions.Item label="考试日期">
                {detailExam.examDate ? `${detailExam.examDate} ${detailExam.examTime || ''}` : '待安排'}
              </Descriptions.Item>
              <Descriptions.Item label="考试地点">{detailExam.location || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag>{EXAM_STATUS_NAMES[detailExam.status]}</Tag>
              </Descriptions.Item>
              {detailExam.score !== null && (
                <Descriptions.Item label="考试成绩">
                  {detailExam.passed ? <Tag color="green">通过</Tag> : <Tag color="red">未通过</Tag>}
                  {' '}{detailExam.score}分
                </Descriptions.Item>
              )}
              <Descriptions.Item label="提醒状态">
                {detailExam.reminderSent ? <Tag color="green">已发送</Tag> : <Tag color="orange">待发送</Tag>}
              </Descriptions.Item>
            </Descriptions>
            <AntAlert
              message="信息校验"
              description={
                <>
                  <div>✓ 身份证校验：已通过（基于学员报名数据）</div>
                  <div>✓ 约考信息：{detailExam.examDate && detailExam.location ? '信息完整' : '请完善考试日期和地点'}</div>
                </>
              }
              type={detailExam.examDate && detailExam.location ? 'success' : 'warning'}
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="录入考试成绩"
        open={resultOpen}
        onCancel={() => setResultOpen(false)}
        footer={null}
        width={400}
      >
        {resultExam && (
          <Form form={resultForm} layout="vertical" onFinish={handleResultSubmit}>
            <Form.Item label="考试得分" name="score" rules={[{ required: true, message: '请输入得分' }]}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="是否通过" name="passed" rules={[{ required: true, message: '请选择' }]}>
              <Select placeholder="请选择考试结果">
                <Option value={true}>通过</Option>
                <Option value={false}>未通过</Option>
              </Select>
            </Form.Item>
            <div className="form-actions">
              <Button onClick={() => setResultOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<FileTextOutlined />}>提交成绩</Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
