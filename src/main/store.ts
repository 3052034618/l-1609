import * as fs from 'fs';
import * as path from 'path';
import {
  Student,
  Coach,
  Vehicle,
  Schedule,
  Appointment,
  Exam,
  Alert,
  SwapRequest,
  StudyRecord
} from '../shared/types';

const DATA_DIR = path.join(process.env.APPDATA || process.env.HOME || './', '.driving-school-db');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

interface Database {
  students: Student[];
  coaches: Coach[];
  vehicles: Vehicle[];
  schedules: Schedule[];
  appointments: Appointment[];
  exams: Exam[];
  alerts: Alert[];
  swapRequests: SwapRequest[];
  studyRecords: StudyRecord[];
}

let db: Database;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDatabase(): Database {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to load database, using initial data', e);
    }
  }
  return getInitialData();
}

function saveDatabase() {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getInitialData(): Database {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const coaches: Coach[] = [
    {
      id: 'coach_001',
      name: '张教练',
      idCard: '110101198001011234',
      phone: '13800138001',
      level: 'master',
      licenseNumber: 'JL20200001',
      hireDate: '2015-03-15',
      totalStudents: 156,
      currentStudents: 18,
      maxDailyHours: 8,
      weeklySchedule: [1, 1, 1, 1, 1, 1, 0],
      status: 'active'
    },
    {
      id: 'coach_002',
      name: '李教练',
      idCard: '110101198502022345',
      phone: '13800138002',
      level: 'senior',
      licenseNumber: 'JL20200002',
      hireDate: '2017-06-20',
      totalStudents: 98,
      currentStudents: 15,
      maxDailyHours: 8,
      weeklySchedule: [1, 1, 1, 1, 1, 0, 1],
      status: 'active'
    },
    {
      id: 'coach_003',
      name: '王教练',
      idCard: '110101199003033456',
      phone: '13800138003',
      level: 'intermediate',
      licenseNumber: 'JL20200003',
      hireDate: '2019-09-10',
      totalStudents: 45,
      currentStudents: 12,
      maxDailyHours: 8,
      weeklySchedule: [1, 1, 1, 1, 1, 0, 0],
      status: 'active'
    },
    {
      id: 'coach_004',
      name: '赵教练',
      idCard: '110101199204044567',
      phone: '13800138004',
      level: 'junior',
      licenseNumber: 'JL20200004',
      hireDate: '2021-01-05',
      totalStudents: 20,
      currentStudents: 8,
      maxDailyHours: 6,
      weeklySchedule: [1, 1, 1, 1, 0, 1, 0],
      status: 'active'
    }
  ];

  const vehicles: Vehicle[] = [
    {
      id: 'vehicle_001',
      plateNumber: '京A·12345',
      brand: '大众',
      model: '桑塔纳',
      year: 2022,
      type: 'manual',
      status: 'available',
      currentCoachId: 'coach_001',
      lastMaintenanceDate: '2026-05-01',
      nextMaintenanceDate: '2026-08-01',
      totalUsageHours: 1250
    },
    {
      id: 'vehicle_002',
      plateNumber: '京A·23456',
      brand: '大众',
      model: '朗逸',
      year: 2023,
      type: 'automatic',
      status: 'available',
      currentCoachId: 'coach_002',
      lastMaintenanceDate: '2026-05-10',
      nextMaintenanceDate: '2026-08-10',
      totalUsageHours: 890
    },
    {
      id: 'vehicle_003',
      plateNumber: '京A·34567',
      brand: '丰田',
      model: '卡罗拉',
      year: 2022,
      type: 'automatic',
      status: 'available',
      currentCoachId: 'coach_003',
      lastMaintenanceDate: '2026-04-20',
      nextMaintenanceDate: '2026-07-20',
      totalUsageHours: 1100
    },
    {
      id: 'vehicle_004',
      plateNumber: '京A·45678',
      brand: '本田',
      model: '思域',
      year: 2023,
      type: 'manual',
      status: 'maintenance',
      currentCoachId: null,
      lastMaintenanceDate: '2026-06-10',
      nextMaintenanceDate: '2026-09-10',
      totalUsageHours: 760
    },
    {
      id: 'vehicle_005',
      plateNumber: '京A·56789',
      brand: '日产',
      model: '轩逸',
      year: 2024,
      type: 'automatic',
      status: 'available',
      currentCoachId: 'coach_004',
      lastMaintenanceDate: '2026-06-01',
      nextMaintenanceDate: '2026-09-01',
      totalUsageHours: 320
    }
  ];

  const students: Student[] = [
    {
      id: 'student_001',
      name: '陈小明',
      idCard: '110101200005055678',
      phone: '13900139001',
      gender: 'male',
      birthDate: '2000-05-05',
      age: 26,
      photo: '',
      address: '北京市朝阳区xxx街道',
      enrollDate: '2026-03-15',
      status: 'active',
      totalHours: 62,
      completedHours: 28,
      remainingHours: 34,
      currentSubject: 'subject2',
      subject1Hours: 12,
      subject2Hours: 16,
      subject3Hours: 0,
      subject4Hours: 0,
      lastStudyDate: yesterdayStr,
      notes: ''
    },
    {
      id: 'student_002',
      name: '刘小红',
      idCard: '110101199806066789',
      phone: '13900139002',
      gender: 'female',
      birthDate: '1998-06-06',
      age: 28,
      photo: '',
      address: '北京市海淀区xxx街道',
      enrollDate: '2026-02-20',
      status: 'active',
      totalHours: 62,
      completedHours: 45,
      remainingHours: 17,
      currentSubject: 'subject3',
      subject1Hours: 12,
      subject2Hours: 24,
      subject3Hours: 9,
      subject4Hours: 0,
      lastStudyDate: todayStr,
      notes: ''
    },
    {
      id: 'student_003',
      name: '王小刚',
      idCard: '110101199507077890',
      phone: '13900139003',
      gender: 'male',
      birthDate: '1995-07-07',
      age: 31,
      photo: '',
      address: '北京市西城区xxx街道',
      enrollDate: '2026-05-01',
      status: 'active',
      totalHours: 62,
      completedHours: 8,
      remainingHours: 54,
      currentSubject: 'subject1',
      subject1Hours: 8,
      subject2Hours: 0,
      subject3Hours: 0,
      subject4Hours: 0,
      lastStudyDate: todayStr,
      notes: ''
    },
    {
      id: 'student_004',
      name: '张美丽',
      idCard: '110101200208088901',
      phone: '13900139004',
      gender: 'female',
      birthDate: '2002-08-08',
      age: 24,
      photo: '',
      address: '北京市东城区xxx街道',
      enrollDate: '2026-01-10',
      status: 'active',
      totalHours: 62,
      completedHours: 62,
      remainingHours: 0,
      currentSubject: 'subject4',
      subject1Hours: 12,
      subject2Hours: 24,
      subject3Hours: 20,
      subject4Hours: 6,
      lastStudyDate: yesterdayStr,
      notes: '即将完成全部学时'
    },
    {
      id: 'student_005',
      name: '李大伟',
      idCard: '110101199009099012',
      phone: '13900139005',
      gender: 'male',
      birthDate: '1990-09-09',
      age: 36,
      photo: '',
      address: '北京市丰台区xxx街道',
      enrollDate: '2026-04-01',
      status: 'active',
      totalHours: 62,
      completedHours: 15,
      remainingHours: 47,
      currentSubject: 'subject2',
      subject1Hours: 12,
      subject2Hours: 3,
      subject3Hours: 0,
      subject4Hours: 0,
      lastStudyDate: '2026-05-20',
      notes: ''
    },
    {
      id: 'student_006',
      name: '赵晓燕',
      idCard: '110101198810100123',
      phone: '13900139006',
      gender: 'female',
      birthDate: '1988-10-10',
      age: 38,
      photo: '',
      address: '北京市石景山区xxx街道',
      enrollDate: '2026-02-28',
      status: 'active',
      totalHours: 62,
      completedHours: 35,
      remainingHours: 27,
      currentSubject: 'subject2',
      subject1Hours: 12,
      subject2Hours: 23,
      subject3Hours: 0,
      subject4Hours: 0,
      lastStudyDate: '2026-05-15',
      notes: ''
    }
  ];

  const schedules: Schedule[] = [
    {
      id: 'schedule_001',
      date: todayStr,
      coachId: 'coach_001',
      vehicleId: 'vehicle_001',
      startTime: '08:00',
      endTime: '12:00',
      studentIds: ['student_001', 'student_005'],
      status: 'approved',
      approvedBy: 'admin',
      approvedAt: yesterdayStr,
      createdAt: yesterdayStr,
      notes: ''
    },
    {
      id: 'schedule_002',
      date: todayStr,
      coachId: 'coach_002',
      vehicleId: 'vehicle_002',
      startTime: '13:00',
      endTime: '17:00',
      studentIds: ['student_002', 'student_004'],
      status: 'approved',
      approvedBy: 'admin',
      approvedAt: yesterdayStr,
      createdAt: yesterdayStr,
      notes: ''
    },
    {
      id: 'schedule_003',
      date: todayStr,
      coachId: 'coach_003',
      vehicleId: 'vehicle_003',
      startTime: '08:00',
      endTime: '12:00',
      studentIds: ['student_003', 'student_006'],
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      createdAt: todayStr,
      notes: ''
    }
  ];

  const appointments: Appointment[] = [
    {
      id: 'appointment_001',
      studentId: 'student_001',
      coachId: 'coach_001',
      vehicleId: 'vehicle_001',
      scheduleId: 'schedule_001',
      date: todayStr,
      startTime: '08:00',
      endTime: '10:00',
      subject: 'subject2',
      status: 'booked',
      actualHours: 0,
      createdAt: yesterdayStr,
      completedAt: null
    },
    {
      id: 'appointment_002',
      studentId: 'student_002',
      coachId: 'coach_002',
      vehicleId: 'vehicle_002',
      scheduleId: 'schedule_002',
      date: todayStr,
      startTime: '13:00',
      endTime: '15:00',
      subject: 'subject3',
      status: 'booked',
      actualHours: 0,
      createdAt: yesterdayStr,
      completedAt: null
    }
  ];

  const exams: Exam[] = [
    {
      id: 'exam_001',
      studentId: 'student_004',
      type: 'subject4',
      examDate: '2026-06-25',
      examTime: '09:00',
      location: '北京市车管所考试中心',
      status: 'booked',
      score: null,
      passed: null,
      createdAt: '2026-06-10',
      reminderSent: false
    },
    {
      id: 'exam_002',
      studentId: 'student_002',
      type: 'subject3',
      examDate: null,
      examTime: null,
      location: '',
      status: 'suggested',
      score: null,
      passed: null,
      createdAt: todayStr,
      reminderSent: false
    }
  ];

  return {
    students,
    coaches,
    vehicles,
    schedules,
    appointments,
    exams,
    alerts: [],
    swapRequests: [],
    studyRecords: []
  };
}

export function initDatabase() {
  db = loadDatabase();
}

export { db, saveDatabase, generateId };
