import { ipcMain } from 'electron';
import * as XLSX from 'xlsx';
import { db, saveDatabase, generateId, initDatabase } from './store';
import {
  Student,
  Coach,
  Vehicle,
  Schedule,
  Appointment,
  Exam,
  Alert,
  SwapRequest
} from '../shared/types';

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function isValidIdCard(idCard: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(idCard)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i];
  }
  const checkCode = checkCodes[sum % 11];
  return idCard[17].toUpperCase() === checkCode;
}

function parseIdCardBirthDate(idCard: string): string {
  const year = idCard.substring(6, 10);
  const month = idCard.substring(10, 12);
  const day = idCard.substring(12, 14);
  return `${year}-${month}-${day}`;
}

export function registerDatabaseHandlers() {
  initDatabase();

  // Students
  ipcMain.handle('db:getStudents', () => {
    return db.students;
  });

  ipcMain.handle('db:getStudent', (_e, id: string) => {
    return db.students.find(s => s.id === id) || null;
  });

  ipcMain.handle('db:createStudent', (_e, data: Omit<Student, 'id' | 'age'>) => {
    if (!isValidIdCard(data.idCard)) {
      throw new Error('身份证格式不合法，请检查');
    }

    const birthDate = parseIdCardBirthDate(data.idCard);
    const age = calculateAge(birthDate);

    if (age < 18 || age > 70) {
      throw new Error(`年龄必须在18-70周岁之间，当前年龄：${age}岁`);
    }

    if (db.students.some(s => s.idCard === data.idCard)) {
      throw new Error('该身份证号已存在');
    }

    const photoError = validateStudentPhoto(data.photo, { required: true });
    if (photoError) throw new Error(`照片校验失败：${photoError}`);

    const student: Student = {
      ...data,
      id: generateId('student'),
      age,
      birthDate,
      completedHours: data.completedHours || 0,
      remainingHours: (data.totalHours || 62) - (data.completedHours || 0),
      currentSubject: data.currentSubject || 'subject1',
      subject1Hours: data.subject1Hours || 0,
      subject2Hours: data.subject2Hours || 0,
      subject3Hours: data.subject3Hours || 0,
      subject4Hours: data.subject4Hours || 0,
      lastStudyDate: data.lastStudyDate || null,
      status: data.status || 'active'
    };

    db.students.push(student);
    saveDatabase();
    return student;
  });

  ipcMain.handle('db:updateStudent', (_e, id: string, data: Partial<Student>) => {
    const index = db.students.findIndex(s => s.id === id);
    if (index === -1) throw new Error('学员不存在');

    if (data.idCard && data.idCard !== db.students[index].idCard) {
      if (!isValidIdCard(data.idCard)) {
        throw new Error('身份证格式不合法，请检查');
      }
      const birthDate = parseIdCardBirthDate(data.idCard);
      const age = calculateAge(birthDate);
      if (age < 18 || age > 70) {
        throw new Error(`年龄必须在18-70周岁之间，当前年龄：${age}岁`);
      }
      if (db.students.some(s => s.idCard === data.idCard && s.id !== id)) {
        throw new Error('该身份证号已存在');
      }
      data.birthDate = birthDate;
      data.age = age;
    }

    if ('photo' in data) {
      const photoToCheck = data.photo;
      if (!photoToCheck && db.students[index].photo) {
      } else {
        const photoError = validateStudentPhoto(photoToCheck || db.students[index].photo, { required: true });
        if (photoError) throw new Error(`照片校验失败：${photoError}`);
      }
    }

    db.students[index] = { ...db.students[index], ...data };
    saveDatabase();
    return db.students[index];
  });

  ipcMain.handle('db:deleteStudent', (_e, id: string) => {
    const index = db.students.findIndex(s => s.id === id);
    if (index === -1) throw new Error('学员不存在');
    db.students.splice(index, 1);
    saveDatabase();
    return true;
  });

  // Coaches
  ipcMain.handle('db:getCoaches', () => db.coaches);

  ipcMain.handle('db:getCoach', (_e, id: string) => {
    return db.coaches.find(c => c.id === id) || null;
  });

  ipcMain.handle('db:createCoach', (_e, data: Omit<Coach, 'id'>) => {
    const coach: Coach = {
      ...data,
      id: generateId('coach'),
      totalStudents: data.totalStudents || 0,
      currentStudents: data.currentStudents || 0,
      status: data.status || 'active'
    };
    db.coaches.push(coach);
    saveDatabase();
    return coach;
  });

  ipcMain.handle('db:updateCoach', (_e, id: string, data: Partial<Coach>) => {
    const index = db.coaches.findIndex(c => c.id === id);
    if (index === -1) throw new Error('教练不存在');
    db.coaches[index] = { ...db.coaches[index], ...data };
    saveDatabase();
    return db.coaches[index];
  });

  ipcMain.handle('db:deleteCoach', (_e, id: string) => {
    const index = db.coaches.findIndex(c => c.id === id);
    if (index === -1) throw new Error('教练不存在');
    db.coaches.splice(index, 1);
    saveDatabase();
    return true;
  });

  // Vehicles
  ipcMain.handle('db:getVehicles', () => db.vehicles);

  ipcMain.handle('db:getVehicle', (_e, id: string) => {
    return db.vehicles.find(v => v.id === id) || null;
  });

  ipcMain.handle('db:createVehicle', (_e, data: Omit<Vehicle, 'id'>) => {
    const vehicle: Vehicle = {
      ...data,
      id: generateId('vehicle'),
      totalUsageHours: data.totalUsageHours || 0,
      status: data.status || 'available'
    };
    db.vehicles.push(vehicle);
    saveDatabase();
    return vehicle;
  });

  ipcMain.handle('db:updateVehicle', (_e, id: string, data: Partial<Vehicle>) => {
    const index = db.vehicles.findIndex(v => v.id === id);
    if (index === -1) throw new Error('车辆不存在');
    db.vehicles[index] = { ...db.vehicles[index], ...data };
    saveDatabase();
    return db.vehicles[index];
  });

  ipcMain.handle('db:deleteVehicle', (_e, id: string) => {
    const index = db.vehicles.findIndex(v => v.id === id);
    if (index === -1) throw new Error('车辆不存在');
    db.vehicles.splice(index, 1);
    saveDatabase();
    return true;
  });

  // Schedules - Smart scheduling
  ipcMain.handle('db:getSchedules', () => db.schedules);

  const COACH_LEVEL_WEIGHT: Record<string, number> = {
    'gold': 4,
    'senior': 3,
    'intermediate': 2,
    'junior': 1
  };

  ipcMain.handle('db:generateSchedules', (_e, dateStr: string) => {
    const date = new Date(dateStr);
    // JS getDay(): 0=周日 1=周一 ... 6=周六
    // weeklySchedule[]: [0]=周一 [1]=周二 ... [5]=周六 [6]=周日
    // → 需要转换索引
    const jsDayOfWeek = date.getDay();
    const coachScheduleIndex = (jsDayOfWeek + 6) % 7;
    const todaySchedules: Schedule[] = [];

    // 1. 找当天在岗、且工作日值班的教练
    const availableCoaches = db.coaches.filter(c =>
      c.status === 'active' && c.weeklySchedule[coachScheduleIndex] === 1
    );

    // 2. 找当前可用的车辆（status=available 且 当天无预约/排班冲突）
    const allAvailableVehicles = db.vehicles.filter(v => v.status === 'available');

    const activeStudents = db.students.filter(
      s => s.status === 'active' && s.remainingHours > 0
    );

    // 统计当天每个教练已排的学时
    const coachHourCounts: Record<string, number> = {};
    availableCoaches.forEach(c => {
      coachHourCounts[c.id] = db.schedules
        .filter(s => s.coachId === c.id && s.status !== 'rejected' && s.date === dateStr)
        .reduce((sum, s) => {
          const [sh, sm] = s.startTime.split(':').map(Number);
          const [eh, em] = s.endTime.split(':').map(Number);
          return sum + (eh - sh) + (em - sm) / 60;
        }, 0);
    });

    // 3. 资质加权排序：资质高的优先；资质相同时，当天已排学时少的优先（公平轮换）
    const sortedCoaches = [...availableCoaches].sort((a, b) => {
      const weightA = COACH_LEVEL_WEIGHT[a.level] ?? 0;
      const weightB = COACH_LEVEL_WEIGHT[b.level] ?? 0;
      if (weightB !== weightA) return weightB - weightA;
      return (coachHourCounts[a.id] || 0) - (coachHourCounts[b.id] || 0);
    });

    const timeSlots = [
      { start: '08:00', end: '12:00', hours: 4 },
      { start: '13:00', end: '17:00', hours: 4 }
    ];

    function hasCoachSlotConflict(coachId: string, start: string, end: string): boolean {
      return db.schedules
        .filter(s => s.coachId === coachId && s.date === dateStr && s.status !== 'rejected')
        .some(s => !(parseTime(end) <= parseTime(s.startTime) || parseTime(start) >= parseTime(s.endTime)))
        || todaySchedules
          .filter(s => s.coachId === coachId)
          .some(s => !(parseTime(end) <= parseTime(s.startTime) || parseTime(start) >= parseTime(s.endTime)));
    }

    function hasVehicleSlotConflict(vehicleId: string, start: string, end: string): boolean {
      const scheduleConflict = db.schedules
        .filter(s => s.vehicleId === vehicleId && s.date === dateStr && s.status !== 'rejected')
        .some(s => !(parseTime(end) <= parseTime(s.startTime) || parseTime(start) >= parseTime(s.endTime)));
      const appointmentConflict = db.appointments
        .filter(a => a.vehicleId === vehicleId && a.date === dateStr && a.status !== 'cancelled')
        .some(a => !(parseTime(end) <= parseTime(a.startTime) || parseTime(start) >= parseTime(a.endTime)));
      const todayConflict = todaySchedules
        .filter(s => s.vehicleId === vehicleId)
        .some(s => !(parseTime(end) <= parseTime(s.startTime) || parseTime(start) >= parseTime(s.endTime)));
      return scheduleConflict || appointmentConflict || todayConflict;
    }

    // 按时间段逐个排
    for (const slot of timeSlots) {
      // 优先选资质最高、且有剩余工时、且时段无冲突的教练
      const coach = sortedCoaches.find(c => {
        const currentHours = coachHourCounts[c.id] || 0;
        if (currentHours + slot.hours > c.maxDailyHours) return false;
        if (hasCoachSlotConflict(c.id, slot.start, slot.end)) return false;
        return true;
      });
      if (!coach) continue;

      // 找此时段可用、无冲突的车辆
      const vehicle = allAvailableVehicles.find(v => {
        if (v.status !== 'available') return false;
        return !hasVehicleSlotConflict(v.id, slot.start, slot.end);
      });
      if (!vehicle) continue;

      // 从 activeStudents 里找当天还没排班、且有剩余学时的学员
      const slotStudents = activeStudents
        .filter(s => !todaySchedules.some(sc => sc.studentIds.includes(s.id)))
        .slice(0, 2)
        .map(s => s.id);

      if (slotStudents.length > 0) {
        const levelNames: Record<string, string> = {
          gold: '金牌', senior: '高级', intermediate: '中级', junior: '初级'
        };
        const schedule: Schedule = {
          id: generateId('schedule'),
          date: dateStr,
          coachId: coach.id,
          vehicleId: vehicle.id,
          startTime: slot.start,
          endTime: slot.end,
          studentIds: slotStudents,
          status: 'pending',
          approvedBy: null,
          approvedAt: null,
          createdAt: new Date().toISOString(),
          notes: `AI自动排班 - 教练资质:${levelNames[coach.level] || coach.level} | 当日累计:${(coachHourCounts[coach.id] || 0) + slot.hours}h/${coach.maxDailyHours}h`
        };
        todaySchedules.push(schedule);
        coachHourCounts[coach.id] = (coachHourCounts[coach.id] || 0) + slot.hours;
      }
    }

    db.schedules.push(...todaySchedules);
    saveDatabase();
    return todaySchedules;
  });

  ipcMain.handle('db:createSchedule', (_e, data: Omit<Schedule, 'id'>) => {
    const schedule: Schedule = {
      ...data,
      id: generateId('schedule'),
      status: data.status || 'pending',
      createdAt: new Date().toISOString()
    };
    db.schedules.push(schedule);
    saveDatabase();
    return schedule;
  });

  ipcMain.handle('db:updateSchedule', (_e, id: string, data: Partial<Schedule>) => {
    const index = db.schedules.findIndex(s => s.id === id);
    if (index === -1) throw new Error('排班不存在');

    if (data.status === 'approved' && db.schedules[index].status !== 'approved') {
      data.approvedBy = data.approvedBy || 'admin';
      data.approvedAt = new Date().toISOString();
    }

    db.schedules[index] = { ...db.schedules[index], ...data };
    saveDatabase();
    return db.schedules[index];
  });

  ipcMain.handle('db:deleteSchedule', (_e, id: string) => {
    const index = db.schedules.findIndex(s => s.id === id);
    if (index === -1) throw new Error('排班不存在');
    db.schedules.splice(index, 1);
    saveDatabase();
    return true;
  });

  // Appointments
  ipcMain.handle('db:getAppointments', () => db.appointments);

  ipcMain.handle('db:createAppointment', (_e, data: Omit<Appointment, 'id'>) => {
    const coach = db.coaches.find(c => c.id === data.coachId);
    if (!coach) throw new Error('所选教练不存在');
    if (coach.status !== 'active') throw new Error(`预约失败：教练【${coach.name}】当前不在岗（状态:${coach.status}），无法安排教学`);

    // 校验该日期是否在教练的工作日排班中
    const apptDate = new Date(data.date);
    const jsDay = apptDate.getDay();
    const scheduleIdx = (jsDay + 6) % 7;
    if (!coach.weeklySchedule[scheduleIdx]) {
      const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      throw new Error(`预约失败：教练【${coach.name}】${weekDays[scheduleIdx]}不上班，无法预约该日期`);
    }

    const vehicle = db.vehicles.find(v => v.id === data.vehicleId);
    if (!vehicle) throw new Error('所选车辆不存在');
    if (vehicle.status !== 'available') {
      const statusName: Record<string, string> = {
        available: '可用', in_use: '使用中', maintenance: '维修中',
        reserved: '已预约', out_of_service: '停用'
      };
      throw new Error(`预约失败：车辆【${vehicle.plateNumber}】当前${statusName[vehicle.status] || vehicle.status}，不可用于教学`);
    }

    const conflict = db.appointments.find(a =>
      a.status !== 'cancelled' &&
      a.date === data.date &&
      (
        (a.coachId === data.coachId) ||
        (a.vehicleId === data.vehicleId) ||
        (a.studentId === data.studentId)
      ) &&
      !(
        (parseTime(data.endTime) <= parseTime(a.startTime)) ||
        (parseTime(data.startTime) >= parseTime(a.endTime))
      )
    );

    if (conflict) {
      if (conflict.coachId === data.coachId) {
        throw new Error('资源锁定失败：该教练此时段已有预约，请更换时段或教练');
      } else if (conflict.vehicleId === data.vehicleId) {
        throw new Error('资源锁定失败：该车辆此时段已被占用，请更换时段或车辆');
      } else {
        throw new Error('资源锁定失败：该学员此时段已有预约，请更换时段');
      }
    }

    const student = db.students.find(s => s.id === data.studentId);
    if (!student) throw new Error('学员不存在');
    if (student.status !== 'active') throw new Error(`学员状态为${student.status}，无法预约教学`);
    if (student.remainingHours <= 0) throw new Error('该学员剩余学时不足，无法预约');

    const appointment: Appointment = {
      ...data,
      id: generateId('appointment'),
      status: 'booked',
      actualHours: 0,
      createdAt: new Date().toISOString()
    };
    db.appointments.push(appointment);
    saveDatabase();
    return appointment;
  });

  ipcMain.handle('db:updateAppointment', (_e, id: string, data: Partial<Appointment>) => {
    const index = db.appointments.findIndex(a => a.id === id);
    if (index === -1) throw new Error('预约不存在');
    db.appointments[index] = { ...db.appointments[index], ...data };
    saveDatabase();
    return db.appointments[index];
  });

  ipcMain.handle('db:completeAppointment', (_e, id: string, actualHours: number) => {
    const index = db.appointments.findIndex(a => a.id === id);
    if (index === -1) throw new Error('预约不存在');

    const appointment = db.appointments[index];
    if (typeof actualHours !== 'number' || isNaN(actualHours) || actualHours <= 0) {
      throw new Error('实际学时无效，请输入大于0的数字');
    }

    // 1. 检查实际学时不超过预约时段本身的时长
    const [sh, sm] = appointment.startTime.split(':').map(Number);
    const [eh, em] = appointment.endTime.split(':').map(Number);
    const slotHours = (eh - sh) + (em - sm) / 60;
    if (actualHours > slotHours + 0.001) {
      throw new Error(`实际学时(${actualHours.toFixed(1)}h)超过预约时段时长(${slotHours.toFixed(1)}h)，请核对`);
    }

    // 2. 检查实际学时不超过学员剩余学时
    const studentIndex = db.students.findIndex(s => s.id === appointment.studentId);
    if (studentIndex === -1) throw new Error('学员不存在');
    const student = db.students[studentIndex];
    if (actualHours > student.remainingHours + 0.001) {
      throw new Error(
        `实际学时(${actualHours.toFixed(1)}h)超过学员剩余学时(${student.remainingHours.toFixed(1)}h)，` +
        `最多只能录入${student.remainingHours.toFixed(1)}小时，请联系主管核实`
      );
    }

    const safeHours = Math.min(actualHours, student.remainingHours, slotHours);

    db.appointments[index] = {
      ...appointment,
      status: 'completed',
      actualHours: safeHours,
      completedAt: new Date().toISOString()
    };

    if (studentIndex !== -1) {
      const subjectKey = `${appointment.subject}Hours` as keyof Student;
      const currentSubjectHours = (student[subjectKey] as number) || 0;

      db.students[studentIndex] = {
        ...student,
        completedHours: student.completedHours + safeHours,
        remainingHours: Math.max(0, student.remainingHours - safeHours),
        [subjectKey]: currentSubjectHours + safeHours,
        lastStudyDate: appointment.date
      };
    }

    const vehicleIndex = db.vehicles.findIndex(v => v.id === appointment.vehicleId);
    if (vehicleIndex !== -1) {
      db.vehicles[vehicleIndex] = {
        ...db.vehicles[vehicleIndex],
        totalUsageHours: db.vehicles[vehicleIndex].totalUsageHours + safeHours
      };
    }

    saveDatabase();
    return db.appointments[index];
  });

  // Exams
  ipcMain.handle('db:getExams', () => db.exams);

  function validateExamIntegrity(studentId: string, examData: Partial<Exam>): string | null {
    const missing: string[] = [];
    const student = db.students.find(s => s.id === studentId);
    if (!student?.idCard) missing.push('身份证号码');
    if (!examData.examDate) missing.push('考试日期');
    if (!examData.examTime) missing.push('考试时间');
    if (!examData.location || String(examData.location).trim() === '') missing.push('考试地点');
    return missing.length === 0 ? null : `信息缺失：${missing.join('、')}，请先完善后再执行此操作`;
  }

  ipcMain.handle('db:createExam', (_e, data: Omit<Exam, 'id'>) => {
    if (data.status === 'approved' || data.status === 'booked') {
      const error = validateExamIntegrity(data.studentId, data);
      if (error) throw new Error(`保存被拦截：${error}`);
    }
    const exam: Exam = {
      ...data,
      id: generateId('exam'),
      status: data.status || 'suggested',
      reminderSent: false,
      createdAt: new Date().toISOString()
    };
    db.exams.push(exam);
    saveDatabase();
    return exam;
  });

  ipcMain.handle('db:updateExam', (_e, id: string, data: Partial<Exam>) => {
    const index = db.exams.findIndex(e => e.id === id);
    if (index === -1) throw new Error('考试记录不存在');
    const merged: Exam = { ...db.exams[index], ...data } as Exam;
    const newStatus = data.status ?? merged.status;
    if ((newStatus === 'approved' || newStatus === 'booked') &&
        (db.exams[index].status !== 'approved' && db.exams[index].status !== 'booked' || Object.keys(data).some(k => k === 'status'))) {
      const error = validateExamIntegrity(merged.studentId, merged);
      if (error) throw new Error(`操作被拦截：${error}`);
    }
    db.exams[index] = merged;
    saveDatabase();
    return db.exams[index];
  });

  ipcMain.handle('db:generateExamSuggestions', () => {
    const suggestions: Exam[] = [];
    const requiredHours: Record<string, number> = {
      subject1: 12,
      subject2: 24,
      subject3: 20,
      subject4: 6
    };
    const subjectOrder = ['subject1', 'subject2', 'subject3', 'subject4'];

    for (const student of db.students.filter(s => s.status === 'active')) {
      let nextSubject: string | null = null;
      for (let i = 0; i < subjectOrder.length; i++) {
        const subj = subjectOrder[i];
        const hoursKey = `${subj}Hours` as keyof Student;
        const hours = (student[hoursKey] as number) || 0;
        if (hours < requiredHours[subj]) {
          break;
        }
        if (i < subjectOrder.length - 1) {
          const nextSubj = subjectOrder[i + 1];
          const nextHoursKey = `${nextSubj}Hours` as keyof Student;
          const nextHours = (student[nextHoursKey] as number) || 0;
          if (nextHours === 0) {
            nextSubject = nextSubj;
            break;
          }
        } else {
          nextSubject = subj;
        }
      }

      if (nextSubject) {
        const existing = db.exams.find(
          e => e.studentId === student.id && e.type === nextSubject &&
               (e.status === 'suggested' || e.status === 'approved' || e.status === 'booked')
        );
        if (!existing) {
          const exam: Exam = {
            id: generateId('exam'),
            studentId: student.id,
            type: nextSubject as any,
            examDate: null,
            examTime: null,
            location: '',
            status: 'suggested',
            score: null,
            passed: null,
            createdAt: new Date().toISOString(),
            reminderSent: false
          };
          db.exams.push(exam);
          suggestions.push(exam);
        }
      }
    }

    saveDatabase();
    return suggestions;
  });

  // Alerts
  ipcMain.handle('db:getAlerts', () => db.alerts);

  ipcMain.handle('db:updateAlert', (_e, id: string, data: Partial<Alert>) => {
    const index = db.alerts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('预警不存在');
    db.alerts[index] = { ...db.alerts[index], ...data };
    saveDatabase();
    return db.alerts[index];
  });

  ipcMain.handle('db:markAlertRead', (_e, id: string) => {
    const index = db.alerts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('预警不存在');
    db.alerts[index] = { ...db.alerts[index], read: true };
    saveDatabase();
    return db.alerts[index];
  });

  ipcMain.handle('db:markAlertHandled', (_e, id: string) => {
    const index = db.alerts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('预警不存在');
    const now = new Date().toISOString();
    db.alerts[index] = {
      ...db.alerts[index],
      read: true,
      handled: true,
      handledBy: 'admin',
      handledAt: now
    };
    saveDatabase();
    return db.alerts[index];
  });

  ipcMain.handle('db:checkInactiveStudents', () => {
    const now = new Date();
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0];

    const newAlerts: Alert[] = [];

    for (const student of db.students.filter(s => s.status === 'active')) {
      if (!student.lastStudyDate || student.lastStudyDate < fifteenDaysAgoStr) {
        const existing = db.alerts.find(
          a => a.studentId === student.id && a.type === 'inactive_student' && !a.handled
        );
        if (!existing) {
          const daysInactive = student.lastStudyDate
            ? Math.floor((now.getTime() - new Date(student.lastStudyDate).getTime()) / (1000 * 60 * 60 * 24))
            : Math.floor((now.getTime() - new Date(student.enrollDate).getTime()) / (1000 * 60 * 60 * 24));

          const alert: Alert = {
            id: generateId('alert'),
            type: 'inactive_student',
            studentId: student.id,
            message: `学员【${student.name}】已连续${daysInactive}天无学时记录，请客服跟进`,
            createdAt: new Date().toISOString(),
            read: false,
            handled: false,
            handledBy: null,
            handledAt: null
          };
          db.alerts.push(alert);
          newAlerts.push(alert);
        }
      }
    }

    saveDatabase();
    return newAlerts;
  });

  // Swap requests
  ipcMain.handle('db:getSwapRequests', () => db.swapRequests);

  ipcMain.handle('db:createSwapRequest', (_e, data: Omit<SwapRequest, 'id'>) => {
    const request: SwapRequest = {
      ...data,
      id: generateId('swap'),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.swapRequests.push(request);
    saveDatabase();
    return request;
  });

  ipcMain.handle('db:approveSwapRequest', (_e, id: string) => {
    const index = db.swapRequests.findIndex(r => r.id === id);
    if (index === -1) throw new Error('调换申请不存在');

    const request = db.swapRequests[index];
    db.swapRequests[index] = {
      ...request,
      status: 'approved',
      approvedBy: 'admin',
      approvedAt: new Date().toISOString()
    };

    if (request.toCoachId) {
      const scheduleIndex = db.schedules.findIndex(s => s.id === request.scheduleId);
      if (scheduleIndex !== -1) {
        db.schedules[scheduleIndex] = {
          ...db.schedules[scheduleIndex],
          coachId: request.toCoachId
        };
      }
    }

    saveDatabase();
    return db.swapRequests[index];
  });

  ipcMain.handle('db:rejectSwapRequest', (_e, id: string) => {
    const index = db.swapRequests.findIndex(r => r.id === id);
    if (index === -1) throw new Error('调换申请不存在');

    db.swapRequests[index] = {
      ...db.swapRequests[index],
      status: 'rejected',
      approvedBy: 'admin',
      approvedAt: new Date().toISOString()
    };

    saveDatabase();
    return db.swapRequests[index];
  });

  // Statistics
  ipcMain.handle('db:getStatistics', (_e, params: { startDate?: string; endDate?: string }) => {
    return computeStatistics(params);
  });

  ipcMain.handle('db:exportReport', async (_e, params: { startDate: string; endDate: string; filePath: string }) => {
    const stats = computeStatistics(params);

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
        '资质等级': c.level,
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
        '状态': v.status
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

    XLSX.writeFile(wb, params.filePath);
    return true;
  });
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function validateStudentPhoto(photo: string | undefined | null, options: { required?: boolean } = {}): string | null {
  const { required = true } = options;
  if (!photo || photo.trim() === '') {
    if (required) return '学员照片缺失，请上传照片（照片为必填项）';
    return null;
  }
  if (typeof photo !== 'string') return '照片数据格式异常';
  if (!/^data:image\//i.test(photo)) return '照片格式不正确，请上传JPG/PNG等标准图片';
  if (photo.length < 2000) return '照片文件过小，可能为无效图片，请重新上传（建议≥300×400像素）';
  return null;
}

function computeStatistics(params: { startDate?: string; endDate?: string }) {
  const { startDate, endDate } = params;

  const completedAppointments = db.appointments.filter(a => {
    if (a.status !== 'completed') return false;
    if (startDate && a.date < startDate) return false;
    if (endDate && a.date > endDate) return false;
    return true;
  });

  const coachStats = db.coaches.map(coach => {
    const coachAppointments = completedAppointments.filter(a => a.coachId === coach.id);
    const totalHours = coachAppointments.reduce((sum, a) => sum + a.actualHours, 0);
    const studentIds = [...new Set(coachAppointments.map(a => a.studentId))];
    const passCount = db.exams.filter(
      e => studentIds.includes(e.studentId) && e.passed === true
    ).length;
    const totalExams = db.exams.filter(
      e => studentIds.includes(e.studentId) && e.status === 'completed'
    ).length;

    return {
      coachId: coach.id,
      coachName: coach.name,
      level: coach.level,
      totalHours,
      studentCount: studentIds.length,
      passRate: totalExams > 0 ? (passCount / totalExams * 100).toFixed(1) + '%' : 'N/A'
    };
  });

  const vehicleStats = db.vehicles.map(vehicle => {
    const vehicleAppointments = completedAppointments.filter(a => a.vehicleId === vehicle.id);
    const totalHours = vehicleAppointments.reduce((sum, a) => sum + a.actualHours, 0);
    const periodDays = startDate && endDate
      ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 30;
    const utilizationRate = ((totalHours / (periodDays * 8)) * 100).toFixed(1) + '%';

    return {
      vehicleId: vehicle.id,
      plateNumber: vehicle.plateNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      totalHours,
      utilizationRate,
      status: vehicle.status
    };
  });

  const dateMap: Record<string, number> = {};
  completedAppointments.forEach(a => {
    dateMap[a.date] = (dateMap[a.date] || 0) + a.actualHours;
  });
  const timeStats = Object.entries(dateMap).map(([date, hours]) => ({ date, hours }));

  return {
    coachStats,
    vehicleStats,
    timeStats,
    summary: {
      totalStudents: db.students.filter(s => s.status === 'active').length,
      totalCoaches: db.coaches.filter(c => c.status === 'active').length,
      totalVehicles: db.vehicles.length,
      totalHours: completedAppointments.reduce((sum, a) => sum + a.actualHours, 0)
    }
  };
}
