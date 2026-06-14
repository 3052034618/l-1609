export type StudentStatus = 'active' | 'suspended' | 'completed' | 'cancelled';
export type CoachLevel = 'junior' | 'intermediate' | 'senior' | 'master';
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'reserved';
export type ScheduleStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type AppointmentStatus = 'booked' | 'completed' | 'cancelled' | 'no_show';
export type ExamStatus = 'suggested' | 'approved' | 'booked' | 'completed' | 'failed';
export type ExamType = 'subject1' | 'subject2' | 'subject3' | 'subject4';
export type AlertType = 'inactive_student' | 'upcoming_exam' | 'low_hours';
export type SwapStatus = 'pending' | 'approved' | 'rejected';

export interface Student {
  id: string;
  name: string;
  idCard: string;
  phone: string;
  gender: 'male' | 'female';
  birthDate: string;
  age: number;
  photo: string;
  address: string;
  enrollDate: string;
  status: StudentStatus;
  totalHours: number;
  completedHours: number;
  remainingHours: number;
  currentSubject: ExamType;
  subject1Hours: number;
  subject2Hours: number;
  subject3Hours: number;
  subject4Hours: number;
  lastStudyDate: string | null;
  notes: string;
}

export interface Coach {
  id: string;
  name: string;
  idCard: string;
  phone: string;
  level: CoachLevel;
  licenseNumber: string;
  hireDate: string;
  totalStudents: number;
  currentStudents: number;
  maxDailyHours: number;
  weeklySchedule: number[];
  status: 'active' | 'leave' | 'inactive';
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  type: 'manual' | 'automatic';
  status: VehicleStatus;
  currentCoachId: string | null;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  totalUsageHours: number;
}

export interface Schedule {
  id: string;
  date: string;
  coachId: string;
  vehicleId: string;
  startTime: string;
  endTime: string;
  studentIds: string[];
  status: ScheduleStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  notes: string;
}

export interface Appointment {
  id: string;
  studentId: string;
  coachId: string;
  vehicleId: string;
  scheduleId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  subject: ExamType;
  status: AppointmentStatus;
  actualHours: number;
  createdAt: string;
  completedAt: string | null;
}

export interface Exam {
  id: string;
  studentId: string;
  type: ExamType;
  examDate: string | null;
  examTime: string | null;
  location: string;
  status: ExamStatus;
  score: number | null;
  passed: boolean | null;
  createdAt: string;
  reminderSent: boolean;
}

export interface Alert {
  id: string;
  type: AlertType;
  studentId: string;
  message: string;
  createdAt: string;
  read: boolean;
  handled: boolean;
  handledBy: string | null;
  handledAt: string | null;
}

export interface SwapRequest {
  id: string;
  scheduleId: string;
  fromCoachId: string;
  toCoachId: string | null;
  reason: string;
  status: SwapStatus;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

declare global {
  interface Window {
    api: {
      getStudents: () => Promise<Student[]>;
      getStudent: (id: string) => Promise<Student | null>;
      createStudent: (data: Omit<Student, 'id' | 'age'>) => Promise<Student>;
      updateStudent: (id: string, data: Partial<Student>) => Promise<Student>;
      deleteStudent: (id: string) => Promise<boolean>;

      getCoaches: () => Promise<Coach[]>;
      getCoach: (id: string) => Promise<Coach | null>;
      createCoach: (data: Omit<Coach, 'id'>) => Promise<Coach>;
      updateCoach: (id: string, data: Partial<Coach>) => Promise<Coach>;
      deleteCoach: (id: string) => Promise<boolean>;

      getVehicles: () => Promise<Vehicle[]>;
      getVehicle: (id: string) => Promise<Vehicle | null>;
      createVehicle: (data: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
      updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<Vehicle>;
      deleteVehicle: (id: string) => Promise<boolean>;

      getSchedules: () => Promise<Schedule[]>;
      createSchedule: (data: Omit<Schedule, 'id'>) => Promise<Schedule>;
      updateSchedule: (id: string, data: Partial<Schedule>) => Promise<Schedule>;
      deleteSchedule: (id: string) => Promise<boolean>;
      generateSchedules: (date: string) => Promise<Schedule[]>;

      getAppointments: () => Promise<Appointment[]>;
      createAppointment: (data: Omit<Appointment, 'id'>) => Promise<Appointment>;
      updateAppointment: (id: string, data: Partial<Appointment>) => Promise<Appointment>;
      completeAppointment: (id: string, actualHours: number) => Promise<Appointment>;

      getExams: () => Promise<Exam[]>;
      createExam: (data: Omit<Exam, 'id'>) => Promise<Exam>;
      updateExam: (id: string, data: Partial<Exam>) => Promise<Exam>;
      generateExamSuggestions: () => Promise<Exam[]>;

      getAlerts: () => Promise<Alert[]>;
      checkInactiveStudents: () => Promise<Alert[]>;

      getStatistics: (params: { startDate?: string; endDate?: string }) => Promise<any>;
      exportReport: (params: { startDate: string; endDate: string; filePath: string }) => Promise<boolean>;

      getSwapRequests: () => Promise<SwapRequest[]>;
      createSwapRequest: (data: Omit<SwapRequest, 'id'>) => Promise<SwapRequest>;
      approveSwapRequest: (id: string) => Promise<SwapRequest>;
      rejectSwapRequest: (id: string) => Promise<SwapRequest>;
    };
  }
}

const fallbackApi = {
  getStudents: () => Promise.resolve([] as Student[]),
  getStudent: () => Promise.resolve(null as Student | null),
  createStudent: (data: any) => Promise.resolve(data as Student),
  updateStudent: (_id: string, data: any) => Promise.resolve(data as Student),
  deleteStudent: () => Promise.resolve(true),
  getCoaches: () => Promise.resolve([] as Coach[]),
  getCoach: () => Promise.resolve(null as Coach | null),
  createCoach: (data: any) => Promise.resolve(data as Coach),
  updateCoach: (_id: string, data: any) => Promise.resolve(data as Coach),
  deleteCoach: () => Promise.resolve(true),
  getVehicles: () => Promise.resolve([] as Vehicle[]),
  getVehicle: () => Promise.resolve(null as Vehicle | null),
  createVehicle: (data: any) => Promise.resolve(data as Vehicle),
  updateVehicle: (_id: string, data: any) => Promise.resolve(data as Vehicle),
  deleteVehicle: () => Promise.resolve(true),
  getSchedules: () => Promise.resolve([] as Schedule[]),
  createSchedule: (data: any) => Promise.resolve(data as Schedule),
  updateSchedule: (_id: string, data: any) => Promise.resolve(data as Schedule),
  deleteSchedule: () => Promise.resolve(true),
  generateSchedules: () => Promise.resolve([] as Schedule[]),
  getAppointments: () => Promise.resolve([] as Appointment[]),
  createAppointment: (data: any) => Promise.resolve(data as Appointment),
  updateAppointment: (_id: string, data: any) => Promise.resolve(data as Appointment),
  completeAppointment: (_id: string, _hours: number) => Promise.resolve({} as Appointment),
  getExams: () => Promise.resolve([] as Exam[]),
  createExam: (data: any) => Promise.resolve(data as Exam),
  updateExam: (_id: string, data: any) => Promise.resolve(data as Exam),
  generateExamSuggestions: () => Promise.resolve([] as Exam[]),
  getAlerts: () => Promise.resolve([] as Alert[]),
  checkInactiveStudents: () => Promise.resolve([] as Alert[]),
  getStatistics: () => Promise.resolve({ coachStats: [], vehicleStats: [], timeStats: [], summary: {} }),
  exportReport: () => Promise.resolve(true),
  getSwapRequests: () => Promise.resolve([] as SwapRequest[]),
  createSwapRequest: (data: any) => Promise.resolve(data as SwapRequest),
  approveSwapRequest: () => Promise.resolve({} as SwapRequest),
  rejectSwapRequest: () => Promise.resolve({} as SwapRequest)
};

export const api: Window['api'] = typeof window !== 'undefined' && window.api ? window.api : fallbackApi;
