import { useState, useEffect } from 'react';
import {
  Card,
  DatePicker,
  Button,
  Table,
  Row,
  Col,
  Statistic,
  Tabs,
  Space,
  message,
  Tag,
  Progress
} from 'antd';
import {
  DownloadOutlined,
  BarChartOutlined,
  TeamOutlined,
  CarOutlined,
  CalendarOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { api } from '../services/api';
import { COACH_LEVEL_NAMES, VEHICLE_STATUS_NAMES } from '../utils/validators';

const { RangePicker } = DatePicker;

export default function Statistics() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [stats, setStats] = useState<any>({
    coachStats: [],
    vehicleStats: [],
    timeStats: [],
    summary: {}
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const params: any = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      const data = await api.getStatistics(params);
      setStats(data);
    } catch (e: any) {
      message.error(e.message || '加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const params = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };
      const stats = await api.getStatistics(params);

      const wb = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.json_to_sheet([{
        '统计周期': `${params.startDate} 至 ${params.endDate}`,
        '活跃学员数': stats.summary.totalStudents,
        '在岗教练数': stats.summary.totalCoaches,
        '车辆总数': stats.summary.totalVehicles,
        '总教学学时': stats.summary.totalHours
      }]);
      XLSX.utils.book_append_sheet(wb, summarySheet, '运营概览');

      const coachSheet = XLSX.utils.json_to_sheet(
        stats.coachStats.map((c: any) => ({
          '教练姓名': c.coachName,
          '资质等级': COACH_LEVEL_NAMES[c.level] || c.level,
          '教学学时': c.totalHours,
          '学员人数': c.studentCount,
          '通过率': c.passRate
        }))
      );
      XLSX.utils.book_append_sheet(wb, coachSheet, '教练统计');

      const vehicleSheet = XLSX.utils.json_to_sheet(
        stats.vehicleStats.map((v: any) => ({
          '车牌号': v.plateNumber,
          '品牌': v.brand,
          '型号': v.model,
          '使用时长(小时)': v.totalHours,
          '利用率': v.utilizationRate,
          '状态': VEHICLE_STATUS_NAMES[v.status] || v.status
        }))
      );
      XLSX.utils.book_append_sheet(wb, vehicleSheet, '车辆统计');

      const timeSheet = XLSX.utils.json_to_sheet(
        stats.timeStats.map((t: any) => ({
          '日期': t.date,
          '学时': t.hours
        }))
      );
      XLSX.utils.book_append_sheet(wb, timeSheet, '学时趋势');

      const fileName = `驾校运营报表_${dateRange[0].format('YYYYMM')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success(`报表已导出：${fileName}`);
    } catch (e: any) {
      message.error(e.message || '导出失败');
    }
  }

  const coachColumns = [
    { title: '教练姓名', dataIndex: 'coachName', key: 'coachName' },
    {
      title: '资质等级',
      dataIndex: 'level',
      key: 'level',
      render: (l: string) => {
        const color = l === 'master' ? 'gold' : l === 'senior' ? 'purple' : l === 'intermediate' ? 'blue' : 'green';
        return <Tag color={color}>{COACH_LEVEL_NAMES[l]}</Tag>;
      }
    },
    {
      title: '教学学时',
      dataIndex: 'totalHours',
      key: 'totalHours',
      render: (h: number) => `${h}小时`,
      sorter: (a: any, b: any) => a.totalHours - b.totalHours
    },
    { title: '教学学员数', dataIndex: 'studentCount', key: 'studentCount' },
    {
      title: '考试通过率',
      dataIndex: 'passRate',
      key: 'passRate'
    }
  ];

  const vehicleColumns = [
    { title: '车牌号', dataIndex: 'plateNumber', key: 'plateNumber' },
    { title: '品牌', dataIndex: 'brand', key: 'brand' },
    { title: '型号', dataIndex: 'model', key: 'model' },
    {
      title: '使用时长',
      dataIndex: 'totalHours',
      key: 'totalHours',
      render: (h: number) => `${h}小时`,
      sorter: (a: any, b: any) => a.totalHours - b.totalHours
    },
    {
      title: '利用率',
      dataIndex: 'utilizationRate',
      key: 'utilizationRate'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const color = s === 'available' ? 'green' : s === 'in_use' ? 'blue' : s === 'maintenance' ? 'red' : 'orange';
        return <Tag color={color}>{VEHICLE_STATUS_NAMES[s]}</Tag>;
      }
    }
  ];

  const hoursTrendOption = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: stats.timeStats.map((t: any) => t.date).sort()
    },
    yAxis: {
      type: 'value',
      name: '学时'
    },
    series: [
      {
        name: '教学学时',
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 119, 255, 0.3)' },
              { offset: 1, color: 'rgba(22, 119, 255, 0.05)' }
            ]
          }
        },
        lineStyle: {
          color: '#1677ff',
          width: 2
        },
        itemStyle: {
          color: '#1677ff'
        },
        data: stats.timeStats.sort((a: any, b: any) => a.date.localeCompare(b.date)).map((t: any) => t.hours)
      }
    ]
  };

  const coachHoursOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: stats.coachStats.map((c: any) => c.coachName)
    },
    yAxis: {
      type: 'value',
      name: '学时'
    },
    series: [
      {
        name: '教学学时',
        type: 'bar',
        data: stats.coachStats.map((c: any) => c.totalHours),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#52c41a' },
              { offset: 1, color: '#95de64' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top'
        }
      }
    ]
  };

  const vehicleUtilOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}小时 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center'
    },
    series: [
      {
        name: '车辆使用',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        data: stats.vehicleStats
          .filter((v: any) => v.totalHours > 0)
          .map((v: any) => ({
            value: v.totalHours,
            name: v.plateNumber
          }))
      }
    ]
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">统计报表</h2>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
          <Button onClick={loadStats}>查询</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel报表
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="在读学员"
              value={stats.summary?.totalStudents || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="在岗教练"
              value={stats.summary?.totalCoaches || 0}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="车辆总数"
              value={stats.summary?.totalVehicles || 0}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总教学学时"
              value={stats.summary?.totalHours || 0}
              suffix="小时"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'charts',
            label: <span><BarChartOutlined /> 数据图表</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <Card title="学时趋势">
                    <ReactECharts option={hoursTrendOption} style={{ height: 300 }} />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="车辆使用占比">
                    <ReactECharts option={vehicleUtilOption} style={{ height: 300 }} />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="教练教学时长统计">
                    <ReactECharts option={coachHoursOption} style={{ height: 300 }} />
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'coach',
            label: <span><TeamOutlined /> 教练统计</span>,
            children: (
              <Card>
                <Table
                  columns={coachColumns}
                  dataSource={stats.coachStats}
                  rowKey="coachId"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  expandable={{
                    expandedRowRender: (record: any) => (
                      <div style={{ padding: '0 24px' }}>
                        <p style={{ margin: 0 }}>
                          <strong>教学完成度：</strong>
                        </p>
                        <Progress
                          percent={Math.min(100, Math.round(record.totalHours / 160 * 100))}
                          format={() => `${record.totalHours} 学时`}
                        />
                      </div>
                    )
                  }}
                />
              </Card>
            )
          },
          {
            key: 'vehicle',
            label: <span><CarOutlined /> 车辆统计</span>,
            children: (
              <Card>
                <Table
                  columns={vehicleColumns}
                  dataSource={stats.vehicleStats}
                  rowKey="vehicleId"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            )
          }
        ]}
      />
    </div>
  );
}
