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

export interface StudyRecord {
  id: string;
  studentId: string;
  coachId: string;
  vehicleId: string;
  date: string;
  hours: number;
  subject: ExamType;
  notes: string;
}
