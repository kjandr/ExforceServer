const { METADATA_MC } = require("../../../../conf_data/confMcFields");
const { createBufferReaders, convertIndexToEnum } = require("./Helper");
const {convertArrayToString} = require("./helper");


function deserializeMcconf_old(buffer) {
    const readers = createBufferReaders(buffer);
    const {
        readUInt8, readInt16, readUInt16, readInt32, readUInt32,
        readFloat16, readFloat32Auto, readArray
    } = readers;

    const conf = {};

    // 1. uint32_t MCCONF_SIGNATURE
    conf.signature = readUInt32();

    // 2–5. uint8_t Felder
    conf.pwm_mode = readUInt8();
    conf.comm_mode = readUInt8();
    conf.motor_type = readUInt8();
    conf.sensor_mode = readUInt8();

    // 6–12. float32_auto Felder
    conf.l_current_max = readFloat32Auto();
    conf.l_current_min = readFloat32Auto();
    conf.l_in_current_max = readFloat32Auto();
    conf.l_in_current_min = readFloat32Auto();
    conf.l_abs_current_max = readFloat32Auto();
    conf.l_min_erpm = readFloat32Auto();
    conf.l_max_erpm = readFloat32Auto();

    // 13. float16 (Skalierungsfaktor 10000)
    conf.l_erpm_start = readFloat16(10000);
    // 14–15. float32_auto
    conf.l_max_erpm_fbrake = readFloat32Auto();
    conf.l_max_erpm_fbrake_cc = readFloat32Auto();
    // 16–17. float32_auto
    conf.l_min_vin = readFloat32Auto();
    conf.l_max_vin = readFloat32Auto();
    // 18–19. float32_auto
    conf.l_battery_cut_start = readFloat32Auto();
    conf.l_battery_cut_end = readFloat32Auto();
    // 20. uint8_t
    conf.l_slow_abs_current = readUInt8();

    // 21–24. float16 (Skalierung 10)
    conf.l_temp_fet_start = readFloat16(10);
    conf.l_temp_fet_end = readFloat16(10);
    conf.l_temp_motor_start = readFloat16(10);
    conf.l_temp_motor_end = readFloat16(10);

    // 25–27. float16 (Skalierung 10000)
    conf.l_temp_accel_dec = readFloat16(10000);
    conf.l_min_duty = readFloat16(10000);
    conf.l_max_duty = readFloat16(10000);

    // 28–29. float32_auto
    conf.l_watt_max = readFloat32Auto();
    conf.l_watt_min = readFloat32Auto();

    // 30–32. float16 (Skalierung 10000)
    conf.l_current_max_scale = readFloat16(10000);
    conf.l_current_min_scale = readFloat16(10000);
    conf.l_duty_start = readFloat16(10000);

    // 33–35. float32_auto
    conf.sl_min_erpm = readFloat32Auto();
    conf.sl_min_erpm_cycle_int_limit = readFloat32Auto();
    conf.sl_max_fullbreak_current_dir_change = readFloat32Auto();

    // 36. float16 (Skalierung 10)
    conf.sl_cycle_int_limit = readFloat16(10);
    // 37. float16 (Skalierung 10000)
    conf.sl_phase_advance_at_br = readFloat16(10000);
    // 38–39. float32_auto
    conf.sl_cycle_int_rpm_br = readFloat32Auto();
    conf.sl_bemf_coupling_k = readFloat32Auto();

    // 40. hall_table: 8 x uint8_t
    conf.hall_table = [];
    for (let i = 0; i < 8; i++) {
        conf.hall_table.push(readUInt8());
    }

    // 41. float32_auto
    conf.hall_sl_erpm = readFloat32Auto();

    // 42–45. float32_auto
    conf.foc_current_kp = readFloat32Auto();
    conf.foc_current_ki = readFloat32Auto();
    conf.foc_f_zv = readFloat32Auto();
    conf.foc_dt_us = readFloat32Auto();

    // 46. uint8_t
    conf.foc_encoder_inverted = readUInt8();

    // 47–52. float32_auto
    conf.foc_encoder_offset = readFloat32Auto();
    conf.foc_encoder_ratio = readFloat32Auto();
    conf.foc_encoder_sin_gain = readFloat32Auto();
    conf.foc_encoder_cos_gain = readFloat32Auto();
    conf.foc_encoder_sin_offset = readFloat32Auto();
    conf.foc_encoder_cos_offset = readFloat32Auto();

    // 53. float32_auto
    conf.foc_encoder_sincos_filter_constant = readFloat32Auto();

    // 54. uint8_t
    conf.foc_sensor_mode = readUInt8();

    // 55–56. float32_auto
    conf.foc_pll_kp = readFloat32Auto();
    conf.foc_pll_ki = readFloat32Auto();

    // 57–60. float32_auto
    conf.foc_motor_l = readFloat32Auto();
    conf.foc_motor_ld_lq_diff = readFloat32Auto();
    conf.foc_motor_r = readFloat32Auto();
    conf.foc_motor_flux_linkage = readFloat32Auto();

    // 61–62. float32_auto
    conf.foc_observer_gain = readFloat32Auto();
    conf.foc_observer_gain_slow = readFloat32Auto();

    // 63. float16 (Skalierung 1000)
    conf.foc_observer_offset = readFloat16(1000);

    // 64–65. float32_auto
    conf.foc_duty_dowmramp_kp = readFloat32Auto();
    conf.foc_duty_dowmramp_ki = readFloat32Auto();

    // 66. float32_auto
    conf.foc_openloop_rpm = readFloat32Auto();

    // 67. float16 (Skalierung 1000)
    conf.foc_openloop_rpm_low = readFloat16(1000);

    // 68–69. float32_auto
    conf.foc_d_gain_scale_start = readFloat32Auto();
    conf.foc_d_gain_scale_max_mod = readFloat32Auto();

    // 70–73. float16 (Skalierung 100)
    conf.foc_sl_openloop_hyst = readFloat16(100);
    conf.foc_sl_openloop_time_lock = readFloat16(100);
    conf.foc_sl_openloop_time_ramp = readFloat16(100);
    conf.foc_sl_openloop_time = readFloat16(100);

    // 74. foc_hall_table: 8 x uint8_t
    conf.foc_hall_table = [];
    for (let i = 0; i < 8; i++) {
        conf.foc_hall_table.push(readUInt8());
    }

    // 75–76. float32_auto
    conf.foc_hall_interp_erpm = readFloat32Auto();
    conf.foc_sl_erpm = readFloat32Auto();

    // 77–78. uint8_t
    conf.foc_sample_v0_v7 = readUInt8();
    conf.foc_sample_high_current = readUInt8();

    // 79. float16 (Skalierung 1000)
    conf.foc_sat_comp = readFloat16(1000);

    // 80. uint8_t
    conf.foc_temp_comp = readUInt8();

    // 81. float16 (Skalierung 100)
    conf.foc_temp_comp_base_temp = readFloat16(100);

    // 82. float16 (Skalierung 10000)
    conf.foc_current_filter_const = readFloat16(10000);

    // 83–84. uint8_t
    conf.foc_cc_decoupling = readUInt8();
    conf.foc_observer_type = readUInt8();

    // 85–88. float32_auto
    conf.foc_hfi_voltage_start = readFloat32Auto();
    conf.foc_hfi_voltage_run = readFloat32Auto();
    conf.foc_hfi_voltage_max = readFloat32Auto();
    conf.foc_sl_erpm_hfi = readFloat32Auto();

    // 89. uint16_t
    conf.foc_hfi_start_samples = readUInt16();

    // 90. float32_auto
    conf.foc_hfi_obs_ovr_sec = readFloat32Auto();

    // 91–92. uint8_t
    conf.foc_hfi_samples = readUInt8();
    conf.foc_offsets_cal_on_boot = readUInt8();

    // 93–95. float32_auto Array (foc_offsets_current[0..2])
    conf.foc_offsets_current = [];
    for (let i = 0; i < 3; i++) {
        conf.foc_offsets_current.push(readFloat32Auto());
    }

    // 96–98. float16 Array (Skalierung 10000) => foc_offsets_voltage[0..2]
    conf.foc_offsets_voltage = [];
    for (let i = 0; i < 3; i++) {
        conf.foc_offsets_voltage.push(readFloat16(10000));
    }

    // 99–101. float16 Array (Skalierung 10000) => foc_offsets_voltage_undriven[0..2]
    conf.foc_offsets_voltage_undriven = [];
    for (let i = 0; i < 3; i++) {
        conf.foc_offsets_voltage_undriven.push(readFloat16(10000));
    }

    // 102. uint8_t
    conf.foc_phase_filter_enable = readUInt8();

    // 103. float32_auto
    conf.foc_phase_filter_max_erpm = readFloat32Auto();

    // 104. uint8_t
    conf.foc_mtpa_mode = readUInt8();

    // 105. float32_auto
    conf.foc_fw_current_max = readFloat32Auto();

    // 106. float16 (Skalierung 10000)
    conf.foc_fw_duty_start = readFloat16(10000);

    // 107. float16 (Skalierung 1000)
    conf.foc_fw_ramp_time = readFloat16(1000);

    // 108. float16 (Skalierung 10000)
    conf.foc_fw_q_current_factor = readFloat16(10000);

    // 109–110. int16_t
    conf.gpd_buffer_notify_left = readInt16();
    conf.gpd_buffer_interpol = readInt16();

    // 111. float16 (Skalierung 10000)
    conf.gpd_current_filter_const = readFloat16(10000);

    // 112–113. float32_auto
    conf.gpd_current_kp = readFloat32Auto();
    conf.gpd_current_ki = readFloat32Auto();

    // 114. uint8_t
    conf.sp_pid_loop_rate = readUInt8();

    // 115–117. float32_auto
    conf.s_pid_kp = readFloat32Auto();
    conf.s_pid_ki = readFloat32Auto();
    conf.s_pid_kd = readFloat32Auto();

    // 118. float16 (Skalierung 10000)
    conf.s_pid_kd_filter = readFloat16(10000);

    // 119. float32_auto
    conf.s_pid_min_erpm = readFloat32Auto();

    // 120. uint8_t
    conf.s_pid_allow_braking = readUInt8();

    // 121. float32_auto
    conf.s_pid_ramp_erpms_s = readFloat32Auto();

    // 122–124. float32_auto
    conf.p_pid_kp = readFloat32Auto();
    conf.p_pid_ki = readFloat32Auto();
    conf.p_pid_kd = readFloat32Auto();

    // 125–126. float32_auto
    conf.p_pid_kd_proc = readFloat32Auto();
    conf.p_pid_kd_filter = readFloat32Auto();

    // 127. float32_auto
    conf.p_pid_ang_div = readFloat32Auto();

    // 128. float16 (Skalierung 10)
    conf.p_pid_gain_dec_angle = readFloat16(10);

    // 129. float32_auto
    conf.p_pid_offset = readFloat32Auto();

    // 130–133. float32_auto
    conf.cc_startup_boost_duty = readFloat32Auto();
    conf.cc_min_current = readFloat32Auto();
    conf.cc_gain = readFloat32Auto();
    conf.cc_ramp_step_max = readFloat32Auto();

    // 134. int32_t
    conf.m_fault_stop_time_ms = readInt32();

    // 135–136. float32_auto
    conf.m_duty_ramp_step = readFloat32Auto();
    conf.m_current_backoff_gain = readFloat32Auto();

    // 137. uint32_t
    conf.m_encoder_counts = readUInt32();

    // 138–140. uint8_t
    conf.m_sensor_port_mode = readUInt8();
    conf.m_invert_direction = readUInt8();
    conf.m_drv8301_oc_mode = readUInt8();

    // 141. uint8_t
    conf.m_drv8301_oc_adj = readUInt8();

    // 142–144. float32_auto
    conf.m_bldc_f_sw_min = readFloat32Auto();
    conf.m_bldc_f_sw_max = readFloat32Auto();
    conf.m_dc_f_sw = readFloat32Auto();

    // 145. float32_auto
    conf.m_ntc_motor_beta = readFloat32Auto();

    // 146–147. uint8_t
    conf.m_out_aux_mode = readUInt8();
    conf.m_motor_temp_sens_type = convertIndexToEnum(readUInt8(), METADATA_MC.m_motor_temp_sens_type.enums);

    // 148. float32_auto
    conf.m_ptc_motor_coeff = readFloat32Auto();

    // 149–150. uint8_t
    conf.m_hall_extra_samples = readUInt8();
    conf.si_motor_poles = readUInt8();

    // 151–152. float32_auto
    conf.si_gear_ratio = readFloat32Auto();
    conf.si_wheel_diameter = readFloat32Auto();

    // 153–154. uint8_t
    conf.si_battery_type = readUInt8();
    // wegen einschrengenden enum-Werte - 10
    conf.si_battery_cells = convertIndexToEnum(readUInt8() - 10, METADATA_MC.si_battery_cells.enums);

    // 155–156. float32_auto
    conf.si_battery_ah = readFloat32Auto();
    conf.si_motor_nl_current = readFloat32Auto();

    // 157. BMS: type (uint8_t)
    conf.bms = {};
    conf.bms.type = readUInt8();

    // 158–161. float16 für BMS: t_limit_start, t_limit_end, soc_limit_start, soc_limit_end
    conf.bms.t_limit_start = readFloat16(100);
    conf.bms.t_limit_end = readFloat16(100);
    conf.bms.soc_limit_start = readFloat16(1000);
    conf.bms.soc_limit_end = readFloat16(1000);

    // 162. BMS: fwd_can_mode (uint8_t)
    conf.bms.fwd_can_mode = readUInt8();

    return conf;
}

function deserializeMcconf_V1(buffer) {
    const readers = createBufferReaders(buffer);
    const {
        readUInt8, readInt16, readUInt16, readInt32, readUInt32,
        readFloat16, readFloat32Auto, readArray
    } = readers;

    const conf = {};

    // 1. uint32_t MCCONF_SIGNATURE
    conf.signature = readUInt32();

    conf.serial_no = convertArrayToString(readArray(16));

    conf.l_current_max = readFloat32Auto();
    conf.l_in_current_max = readFloat32Auto();
    conf.l_in_current_min = readFloat32Auto();
    conf.l_max_erpm = readFloat32Auto();

    conf.l_battery_cut_start = readFloat32Auto();
    conf.l_battery_cut_end = readFloat32Auto();

    conf.l_temp_fet_start = readFloat16(10);
    conf.l_temp_fet_end = readFloat16(10);
    conf.l_temp_motor_start = readFloat16(10);
    conf.l_temp_motor_end = readFloat16(10);

    conf.l_watt_max = readFloat32Auto();

    conf.foc_current_kp = readFloat32Auto();
    conf.foc_current_ki = readFloat32Auto();
    conf.foc_f_zv = readFloat32Auto();

    conf.foc_encoder_inverted = readUInt8();
    conf.foc_encoder_offset = readFloat32Auto();
    conf.foc_encoder_ratio = readFloat32Auto();
    conf.foc_sensor_mode = convertIndexToEnum(readUInt8(), METADATA_MC.foc_sensor_mode.enums);

    conf.foc_motor_l = readFloat32Auto();
    conf.foc_motor_r = readFloat32Auto();
    conf.foc_motor_flux_linkage = readFloat32Auto();

    conf.foc_observer_gain = readFloat32Auto();

    conf.m_motor_temp_sens_type = convertIndexToEnum(readUInt8(), METADATA_MC.m_motor_temp_sens_type.enums);

    conf.si_battery_cells = convertIndexToEnum(readUInt8() - 10, METADATA_MC.si_battery_cells.enums);

    conf.si_battery_ah = readFloat32Auto();

    conf.foc_sl_erpm = readFloat32Auto();

    return conf;
}

module.exports = { deserializeMcconf_V1, deserializeMcconf_old };
