import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getStudents: () => ipcRenderer.invoke('db:getStudents'),
  getStudent: (id: string) => ipcRenderer.invoke('db:getStudent', id),
  createStudent: (data: any) => ipcRenderer.invoke('db:createStudent', data),
  updateStudent: (id: string, data: any) => ipcRenderer.invoke('db:updateStudent', id, data),
  deleteStudent: (id: string) => ipcRenderer.invoke('db:deleteStudent', id),

  getCoaches: () => ipcRenderer.invoke('db:getCoaches'),
  getCoach: (id: string) => ipcRenderer.invoke('db:getCoach', id),
  createCoach: (data: any) => ipcRenderer.invoke('db:createCoach', data),
  updateCoach: (id: string, data: any) => ipcRenderer.invoke('db:updateCoach', id, data),
  deleteCoach: (id: string) => ipcRenderer.invoke('db:deleteCoach', id),

  getVehicles: () => ipcRenderer.invoke('db:getVehicles'),
  getVehicle: (id: string) => ipcRenderer.invoke('db:getVehicle', id),
  createVehicle: (data: any) => ipcRenderer.invoke('db:createVehicle', data),
  updateVehicle: (id: string, data: any) => ipcRenderer.invoke('db:updateVehicle', id, data),
  deleteVehicle: (id: string) => ipcRenderer.invoke('db:deleteVehicle', id),

  getSchedules: () => ipcRenderer.invoke('db:getSchedules'),
  createSchedule: (data: any) => ipcRenderer.invoke('db:createSchedule', data),
  updateSchedule: (id: string, data: any) => ipcRenderer.invoke('db:updateSchedule', id, data),
  deleteSchedule: (id: string) => ipcRenderer.invoke('db:deleteSchedule', id),
  generateSchedules: (date: string) => ipcRenderer.invoke('db:generateSchedules', date),

  getAppointments: () => ipcRenderer.invoke('db:getAppointments'),
  createAppointment: (data: any) => ipcRenderer.invoke('db:createAppointment', data),
  updateAppointment: (id: string, data: any) => ipcRenderer.invoke('db:updateAppointment', id, data),
  completeAppointment: (id: string, actualHours: number) =>
    ipcRenderer.invoke('db:completeAppointment', id, actualHours),

  getExams: () => ipcRenderer.invoke('db:getExams'),
  createExam: (data: any) => ipcRenderer.invoke('db:createExam', data),
  updateExam: (id: string, data: any) => ipcRenderer.invoke('db:updateExam', id, data),
  generateExamSuggestions: () => ipcRenderer.invoke('db:generateExamSuggestions'),

  getAlerts: () => ipcRenderer.invoke('db:getAlerts'),
  checkInactiveStudents: () => ipcRenderer.invoke('db:checkInactiveStudents'),

  getStatistics: (params: any) => ipcRenderer.invoke('db:getStatistics', params),
  exportReport: (params: any) => ipcRenderer.invoke('db:exportReport', params),

  getSwapRequests: () => ipcRenderer.invoke('db:getSwapRequests'),
  createSwapRequest: (data: any) => ipcRenderer.invoke('db:createSwapRequest', data),
  approveSwapRequest: (id: string) => ipcRenderer.invoke('db:approveSwapRequest', id),
  rejectSwapRequest: (id: string) => ipcRenderer.invoke('db:rejectSwapRequest', id)
});
