export function isValidIdCard(idCard: string): { valid: boolean; message: string } {
  if (!idCard) {
    return { valid: false, message: '请输入身份证号' };
  }

  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    return { valid: false, message: '身份证格式不合法，应为18位数字或最后一位为X' };
  }

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i];
  }
  const checkCode = checkCodes[sum % 11];
  if (idCard[17].toUpperCase() !== checkCode) {
    return { valid: false, message: '身份证校验码错误，请检查' };
  }

  return { valid: true, message: '' };
}

export function parseIdCardBirthDate(idCard: string): string {
  if (!/^\d{17}[\dXx]$/.test(idCard)) return '';
  const year = idCard.substring(6, 10);
  const month = idCard.substring(10, 12);
  const day = idCard.substring(12, 14);
  return `${year}-${month}-${day}`;
}

export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function validateAge(age: number): { valid: boolean; message: string } {
  if (age < 18) {
    return { valid: false, message: `年龄不足18周岁（当前${age}岁），不符合报考条件` };
  }
  if (age > 70) {
    return { valid: false, message: `年龄超过70周岁（当前${age}岁），不符合报考条件` };
  }
  return { valid: true, message: '' };
}

export async function validatePhoto(
  file: File | null,
  options: { required?: boolean } = {}
): Promise<{ valid: boolean; message: string }> {
  const { required = true } = options;
  return new Promise((resolve) => {
    if (!file) {
      if (required) {
        resolve({ valid: false, message: '请上传学员照片，照片为必填项' });
      } else {
        resolve({ valid: true, message: '' });
      }
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const ext = file.type ? file.type.split('/')[1]?.toUpperCase() || '未知' : '未知';
      resolve({
        valid: false,
        message: `照片格式不支持：${ext}格式，请上传JPG、PNG、GIF、BMP或WEBP格式的图片`
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size === 0) {
      resolve({ valid: false, message: '照片文件为空，请重新选择有效的图片文件' });
      return;
    }
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      resolve({ valid: false, message: `照片大小为${sizeMB}MB，不能超过5MB` });
      return;
    }

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width <= 0 || img.height <= 0) {
        resolve({ valid: false, message: '无法获取照片尺寸，请重新选择有效图片' });
        return;
      }
      if (img.width < 300 || img.height < 400) {
        resolve({
          valid: false,
          message: `照片分辨率过低(${img.width}×${img.height}像素)，必须至少300×400像素才能保证清晰`
        });
        return;
      }
      if (img.width / img.height > 1.2 || img.height / img.width > 1.8) {
        resolve({
          valid: false,
          message: `照片比例异常(${img.width}:${img.height})，建议使用竖版证件照比例(3:4左右)`
        });
        return;
      }
      resolve({ valid: true, message: '' });
    };
    img.onerror = () => {
      resolve({ valid: false, message: '照片文件损坏或无法读取，请更换其他图片' });
    };
    img.src = URL.createObjectURL(file);
  });
}

export function validateExistingPhoto(
  photoData: string | undefined | null,
  options: { required?: boolean } = {}
): { valid: boolean; message: string } {
  const { required = true } = options;
  if (!photoData || photoData.trim() === '') {
    if (required) {
      return { valid: false, message: '学员照片缺失，请上传照片' };
    }
    return { valid: true, message: '' };
  }
  if (!photoData.startsWith('data:image/')) {
    return { valid: false, message: '照片数据格式不正确，请重新上传' };
  }
  return { valid: true, message: '' };
}

export const SUBJECT_NAMES: Record<string, string> = {
  subject1: '科目一（理论）',
  subject2: '科目二（场地）',
  subject3: '科目三（道路）',
  subject4: '科目四（安全文明）'
};

export const COACH_LEVEL_NAMES: Record<string, string> = {
  junior: '初级教练',
  intermediate: '中级教练',
  senior: '高级教练',
  master: '金牌教练'
};

export const SCHEDULE_STATUS_NAMES: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成'
};

export const VEHICLE_STATUS_NAMES: Record<string, string> = {
  available: '可用',
  in_use: '使用中',
  maintenance: '维修中',
  reserved: '预留'
};

export const STUDENT_STATUS_NAMES: Record<string, string> = {
  active: '在读',
  suspended: '休学',
  completed: '已结业',
  cancelled: '已取消'
};

export const APPOINTMENT_STATUS_NAMES: Record<string, string> = {
  booked: '已预约',
  completed: '已完成',
  cancelled: '已取消',
  no_show: '未到课'
};

export const EXAM_STATUS_NAMES: Record<string, string> = {
  suggested: '建议预约',
  approved: '审核通过',
  booked: '已约考',
  completed: '已完成',
  failed: '未通过'
};
