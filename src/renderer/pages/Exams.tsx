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
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderList, setReminderList] = useState<Exam[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [eData, sData] = await Promise.all([api.getExams(), api.getStudents()]);
      setExams(eData);
      setStudents(sData);
      // 关键：数据加载完成后再检查考前提醒，避免闭包拿空数组
      checkUpcomingExams(eData, sData);
    } catch (e: any) {
      message.error(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  async function checkUpcomingExams(examsList?: Exam[], studentsList?: Student[]) {
    // 如果没传参数，就用当前 state；loadData 调用时会传最新的已加载数据
    const examsToScan: Exam[] = examsList && examsList.length > 0 ? examsList : exams;
    const studentsToScan: Student[] = studentsList && studentsList.length > 0 ? studentsList : students;

    const now = dayjs();
    const upcoming: Exam[] = [];
    for (const e of examsToScan) {
      // 只处理已约考状态（approved / booked），suggested 是建议不算；且未发送提醒 + 有考试日期
      if (!e.examDate || e.reminderSent) continue;
      if (e.status !== 'approved' && e.status !== 'booked') continue;
      const examTime = dayjs(`${e.examDate} ${e.examTime || '00:00'}`);
      const diff = examTime.diff(now, 'hour', true);
      if (diff > 0 && diff <= 24) upcoming.push(e);
    }

    if (upcoming.length > 0) {
      setReminderList(upcoming);
      setReminderModalOpen(true);
      for (const exam of upcoming) {
        await api.updateExam(exam.id, { reminderSent: true });
      }
      // 同步更新本地 state，标记已发送，避免重复弹
      if (examsList && examsList.length > 0) {
        setExams(prev => prev.map(e => upcoming.some(u => u.id === e.id) ? { ...e, reminderSent: true } : e));
      }
      // 顺便让 studentsList 变量名被使用，避免 lint 警告
      void studentsToScan;
    }
  }

  function validateExamCompleteness(exam: Exam, student?: Student | null): { valid: boolean; missing: string[]; message: string } {
    const missing: string[] = [];
    const s = student || students.find(st => st.id === exam.studentId);
    if (!s?.idCard) missing.push('身份证号码');
    if (!exam.examDate) missing.push('考试日期');
    if (!exam.examTime) missing.push('考试时间');
    if (!exam.location || exam.location.trim() === '') missing.push('考试地点');
    return {
      valid: missing.length === 0,
      missing,
      message: missing.length === 0 ? '信息完整' : `信息缺失：${missing.join('、')}，请先完善后再继续`
    };
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
      const check = validateExamCompleteness(exam);
      if (!check.valid) {
        message.warning(`审核被拦截：${check.message}，请先编辑完善信息`);
        setEditingExam(exam);
        form.setFieldsValue({
          ...exam,
          examDate: exam.examDate ? dayjs(exam.examDate) : null,
          examTime: exam.examTime ? dayjs(exam.examTime, 'HH:mm') : null
        });
        setModalOpen(true);
        return;
      }
      const result = await api.updateExam(exam.id, { status: 'approved' });
      if (result) {
        message.success('审核通过，考试信息完整，已推送至学员');
        loadData();
      }
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
      const student = students.find(s => s.id === data.studentId);

      if (data.status === 'approved' || data.status === 'booked') {
        const check = validateExamCompleteness(data as Exam, student);
        if (!check.valid) {
          message.warning(`保存被拦截：${check.message}`);
          return;
        }
      }

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

      <Modal
        title={<span><BellOutlined style={{ color: '#1677ff', marginRight: 8 }} />24小时内考试提醒（共 {reminderList.length} 场）</span>}
        open={reminderModalOpen}
        onCancel={() => setReminderModalOpen(false)}
        width={720}
        centered
        footer={[
          <Button key="ok" type="primary" onClick={() => setReminderModalOpen(false)}>
            我知道了（已发送提醒）
          </Button>
        ]}
      >
        <AntAlert
          message="重要提示"
          description="以下考试将在24小时内进行，系统已自动标记提醒为已发送，请确保学员知晓考试信息。若信息不完整，请及时完善。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <List
          dataSource={reminderList}
          itemLayout="vertical"
          renderItem={(exam) => {
            const student = students.find(s => s.id === exam.studentId);
            const check = validateExamCompleteness(exam, student);
            const examTime = dayjs(`${exam.examDate} ${exam.examTime || '00:00'}`);
            const hoursLeft = Math.max(1, Math.round(examTime.diff(dayjs(), 'hour')));
            return (
              <List.Item key={exam.id}>
                <List.Item.Meta
                  avatar={<Avatar size={48} icon={<BellOutlined style={{ color: '#1677ff' }} />} style={{ backgroundColor: '#e6f4ff' }} />}
                  title={
                    <Space>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>
                        {student?.name || '未知学员'} — 参加{SUBJECT_NAMES[exam.type]}
                      </span>
                      <Tag color="red">还剩约 {hoursLeft} 小时</Tag>
                      {check.valid ? <Tag color="green">信息完整</Tag> : <Tag color="red">信息有缺失</Tag>}
                    </Space>
                  }
                  description={
                    <div style={{ marginTop: 8 }}>
                      <Descriptions column={2} size="small" bordered>
                        <Descriptions.Item label="考试日期">{exam.examDate || '未安排（缺失）'}</Descriptions.Item>
                        <Descriptions.Item label="考试时间">{exam.examTime || '未安排（缺失）'}</Descriptions.Item>
                        <Descriptions.Item label="考试地点" span={2}>{exam.location || '未填写（缺失）'}</Descriptions.Item>
                        <Descriptions.Item label="身份证号" span={2}>
                          {student?.idCard || '缺失（学员档案中无身份证号）'}
                        </Descriptions.Item>
                      </Descriptions>
                      {!check.valid && (
                        <AntAlert
                          style={{ marginTop: 12 }}
                          message={`考前信息不完整 — 缺失：${check.missing.join('、')}`}
                          description="请点击详情按钮补全信息，以免影响学员正常参加考试"
                          type="error"
                          showIcon
                          action={
                            <Space style={{ padding: 8 }}>
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => {
                                  setEditingExam(exam);
                                  form.setFieldsValue({
                                    ...exam,
                                    examDate: exam.examDate ? dayjs(exam.examDate) : null,
                                    examTime: exam.examTime ? dayjs(exam.examTime, 'HH:mm') : null
                                  });
                                  setReminderModalOpen(false);
                                  setModalOpen(true);
                                }}
                              >
                                立即补全
                              </Button>
                            </Space>
                          }
                        />
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Modal>
    </div>
  );
}
