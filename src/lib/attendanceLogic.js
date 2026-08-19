import { supabase } from './supabaseClient';
import { format } from 'date-fns';

export const validateQRCode = (qrCodeData) => {
  try {
    if (!qrCodeData) return null;
    
    // Log raw data for debugging
    console.log('[AttendanceLogic] Validating QR Data:', qrCodeData);

    let id = qrCodeData;

    // Handle JSON format if present (legacy or alternative)
    if (typeof qrCodeData === 'string' && qrCodeData.trim().startsWith('{')) {
        try {
            const data = JSON.parse(qrCodeData);
            if (data.id) id = data.id;
        } catch(e) {
            console.log('[AttendanceLogic] JSON parse failed, treating as string');
        }
    }

    // Handle EMP: prefix if present (legacy support)
    if (typeof id === 'string' && id.startsWith('EMP:')) {
      id = id.split('EMP:')[1];
    }
    
    // Clean whitespace
    id = typeof id === 'string' ? id.trim() : '';

    // UUID validation regex (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(id)) {
        console.log('[AttendanceLogic] Valid UUID found:', id);
        return id;
    }

    console.warn('[AttendanceLogic] Invalid UUID format:', id);
    return null;
  } catch (error) {
    console.error('[AttendanceLogic] Validation error:', error);
    return null;
  }
};

export const checkRecentScan = async (employeeId) => {
  // Prevent duplicate scans within 30 seconds
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('attendance_qr_scans')
    .select('id')
    .eq('employee_id', employeeId)
    .gte('created_at', thirtySecondsAgo)
    .limit(1);
    
  if (error) return false;
  return data && data.length > 0;
};

export const analyzeAttendanceQR = async (qrCode) => {
  console.log('[AttendanceLogic] Analyzing QR:', qrCode);
  const employeeId = validateQRCode(qrCode);
  
  const resultBase = { 
      rawQr: qrCode, 
      extractedId: employeeId 
  };

  if (!employeeId) {
    console.error('[AttendanceLogic] Invalid QR format. Raw:', qrCode);
    return { ...resultBase, success: false, error: 'invalid_qr', message: 'Invalid QR Code format. Expected UUID.' };
  }

  try {
    console.log('[AttendanceLogic] Querying employee ID:', employeeId);
    
    // 1. Fetch Employee with avatar_url
    // We select specific columns to be safe and clear
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, name, role, avatar_url, user_id') 
      .eq('id', employeeId)
      .maybeSingle();
      
    console.log('[AttendanceLogic] Employee Lookup Result:', { employee, error: empError });
      
    if (empError) {
      return { ...resultBase, success: false, error: 'db_error', message: `Database Error: ${empError.message}` };
    }
    
    if (!employee) {
      return { ...resultBase, success: false, error: 'not_found', message: `Employee not found for ID: ${employeeId}` };
    }

    // 2. Check for recent duplicates
    const isDuplicate = await checkRecentScan(employeeId);
    if (isDuplicate) {
        return { ...resultBase, success: false, error: 'duplicate', message: 'Already scanned recently', employee };
    }

    // 3. Determine Attendance State
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();

    if (attError) throw attError;

    let scanType = 'check_in';
    
    if (attendance) {
      if (attendance.check_in_time && !attendance.check_out_time) {
        scanType = 'check_out';
      } else if (attendance.check_in_time && attendance.check_out_time) {
        // Already completed shift
        return { 
            ...resultBase,
            success: false, 
            error: 'completed', 
            message: 'Shift already completed today', 
            employee,
            attendance 
        };
      }
    }

    return { 
        ...resultBase,
        success: true, 
        scanType, 
        employee, 
        attendance,
        message: scanType === 'check_in' ? 'Ready to Check In' : 'Ready to Check Out'
    };

  } catch (error) {
    console.error("Analysis Error:", error);
    return { ...resultBase, success: false, error: 'system_error', message: 'System error processing scan' };
  }
};

export const recordAttendance = async (employeeId, scanType, deviceInfo, ipAddress, existingRecord = null) => {
    try {
        const now = new Date();
        const timeString = format(now, 'HH:mm:ss');
        const todayDate = format(now, 'yyyy-MM-dd');
        let record = null;

        if (scanType === 'check_in') {
            const { data, error } = await supabase
                .from('attendance')
                .upsert({
                    employee_id: employeeId,
                    date: todayDate,
                    status: 'present',
                    check_in_time: timeString,
                    scan_type: 'check_in',
                    device_info: deviceInfo
                }, { onConflict: 'employee_id, date' })
                .select()
                .single();
                
            if (error) throw error;
            record = data;
        } 
        else if (scanType === 'check_out' && existingRecord) {
            const { data, error } = await supabase
                .from('attendance')
                .update({
                    check_out_time: timeString,
                    scan_type: 'check_out', 
                    device_info: { ...existingRecord.device_info, checkout_device: deviceInfo }
                })
                .eq('id', existingRecord.id)
                .select()
                .single();

            if (error) throw error;
            record = data;
        }

        // Log the scan event
        await supabase.from('attendance_qr_scans').insert({
            employee_id: employeeId,
            scan_type: scanType,
            status: 'success',
            device_info: deviceInfo,
            ip_address: ipAddress || 'unknown',
            scan_datetime: now.toISOString()
        });

        return { success: true, record, scanType, timestamp: now };

    } catch (error) {
        console.error("Record Error:", error);
        // Log failure
        await supabase.from('attendance_qr_scans').insert({
            employee_id: employeeId,
            scan_type: scanType,
            status: 'failed',
            notes: error.message,
            scan_datetime: new Date().toISOString()
        });
        return { success: false, message: error.message || 'Failed to record attendance' };
    }
};