const {METADATA_MC} = require("../conf_data/confMcFields");

function serializeMcconf_V1(conf, signature) {
    const parts = [];

    const writeUInt8   = v => parts.push(Buffer.from([v & 0xFF]));
    const writeUInt16  = v => { const b=Buffer.allocUnsafe(2); b.writeUInt16BE(v,0); parts.push(b); };
    const writeInt16   = v => { const b=Buffer.allocUnsafe(2); b.writeInt16BE(v,0); parts.push(b); };
    const writeUInt32  = v => { const b=Buffer.allocUnsafe(4); b.writeUInt32BE(v>>>0,0); parts.push(b); };
    const writeFixed16 = (v, scale) => writeInt16(Math.round(v * scale));

    function writeFloat32Auto(parts, number) {
        // Subnormale Werte < 1.5e-38 auf 0 setzen
        let n = number;
        if (Math.abs(n) < 1.5e-38) {
            n = 0.0;
        }
        // Buffer.writeFloatBE schreibt IEEE‑754 single precision
        const b = Buffer.allocUnsafe(4);
        b.writeFloatBE(n, 0);
        parts.push(b);
    }

    const convertEnumToIndex = (value, enumArray) => {
        // Wenn value bereits eine Zahl ist, direkt zurückgeben
        if (typeof value === 'number') {
            return value;
        }

        // Suche den Index des Wertes im Enum-Array
        const index = enumArray.indexOf(String(value));

        // Wenn nicht gefunden (-1), gib 0 als Standardwert zurück
        return index >= 0 ? index : 0;
    }

    // 1) signature
    writeUInt32(signature);  // Korrigiert: parts als erster Parameter hinzugefügt

    // 2–5) uint8
    writeUInt8(conf.pwm_mode);
    writeUInt8(conf.comm_mode);
    writeUInt8(conf.motor_type);
    writeUInt8(conf.sensor_mode);

    // 6–12) float32_auto
    writeFloat32Auto(parts, conf.l_current_max);
    writeFloat32Auto(parts, conf.l_current_min);
    writeFloat32Auto(parts, conf.l_in_current_max);
    writeFloat32Auto(parts, conf.l_in_current_min);
    writeFloat32Auto(parts, conf.l_abs_current_max);
    writeFloat32Auto(parts, conf.l_min_erpm);
    writeFloat32Auto(parts, conf.l_max_erpm);

    // 13) float16 fixed
    writeFixed16(conf.l_erpm_start, 10000);

    // 14–15) float32_auto
    writeFloat32Auto(parts, conf.l_max_erpm_fbrake);
    writeFloat32Auto(parts, conf.l_max_erpm_fbrake_cc);

    // 16–17) float32_auto
    writeFloat32Auto(parts, conf.l_min_vin);
    writeFloat32Auto(parts, conf.l_max_vin);

    // 18–19) float32_auto
    writeFloat32Auto(parts, conf.l_battery_cut_start);
    writeFloat32Auto(parts, conf.l_battery_cut_end);

    // 20) uint8
    writeUInt8(conf.l_slow_abs_current);

    // 21–24) float16 fixed (scale 10)
    writeFixed16(conf.l_temp_fet_start, 10);
    writeFixed16(conf.l_temp_fet_end,   10);
    writeFixed16(conf.l_temp_motor_start,10);
    writeFixed16(conf.l_temp_motor_end,  10);

    // 25–27) float16 fixed (scale 10000)
    writeFixed16(conf.l_temp_accel_dec, 10000);
    writeFixed16(conf.l_min_duty,       10000);
    writeFixed16(conf.l_max_duty,       10000);

    // 28–29) float32_auto
    writeFloat32Auto(parts, conf.l_watt_max);
    writeFloat32Auto(parts, conf.l_watt_min);

    // 30–32) float16 fixed (scale 10000)
    writeFixed16(conf.l_current_max_scale, 10000);
    writeFixed16(conf.l_current_min_scale, 10000);
    writeFixed16(conf.l_duty_start,        10000);

    // 33–35) float32_auto
    writeFloat32Auto(parts, conf.sl_min_erpm);
    writeFloat32Auto(parts, conf.sl_min_erpm_cycle_int_limit);
    writeFloat32Auto(parts, conf.sl_max_fullbreak_current_dir_change);

    // 36) float16 fixed (scale 10)
    writeFixed16(conf.sl_cycle_int_limit, 10);

    // 37) float16 fixed (scale 10000)
    writeFixed16(conf.sl_phase_advance_at_br, 10000);

    // 38–39) float32_auto
    writeFloat32Auto(parts, conf.sl_cycle_int_rpm_br);
    writeFloat32Auto(parts, conf.sl_bemf_coupling_k);

    // 40) hall_table (8×uint8)
    for (let i = 0; i < 8; i++) writeUInt8(conf.hall_table[i]);

    // 41) float32_auto
    writeFloat32Auto(parts, conf.hall_sl_erpm);

    // 42–45) float32_auto
    writeFloat32Auto(parts, conf.foc_current_kp);
    writeFloat32Auto(parts, conf.foc_current_ki);
    writeFloat32Auto(parts, conf.foc_f_zv);
    writeFloat32Auto(parts, conf.foc_dt_us);

    // 46) uint8
    writeUInt8(conf.foc_encoder_inverted);

    // 47–52) float32_auto
    writeFloat32Auto(parts, conf.foc_encoder_offset);
    writeFloat32Auto(parts, conf.foc_encoder_ratio);
    writeFloat32Auto(parts, conf.foc_encoder_sin_gain);
    writeFloat32Auto(parts, conf.foc_encoder_cos_gain);
    writeFloat32Auto(parts, conf.foc_encoder_sin_offset);
    writeFloat32Auto(parts, conf.foc_encoder_cos_offset);

    // 53) float32_auto
    writeFloat32Auto(parts, conf.foc_encoder_sincos_filter_constant);

    // 54) uint8
    writeUInt8(conf.foc_sensor_mode);

    // 55–56) float32_auto
    writeFloat32Auto(parts, conf.foc_pll_kp);
    writeFloat32Auto(parts, conf.foc_pll_ki);

    // 57–60) float32_auto
    writeFloat32Auto(parts, conf.foc_motor_l);
    writeFloat32Auto(parts, conf.foc_motor_ld_lq_diff);
    writeFloat32Auto(parts, conf.foc_motor_r);
    writeFloat32Auto(parts, conf.foc_motor_flux_linkage);  // Korrigiert: cparts zu parts und onf zu conf

    // 61–62) float32_auto
    writeFloat32Auto(parts, conf.foc_observer_gain);
    writeFloat32Auto(parts, conf.foc_observer_gain_slow);

    // 63) float16 fixed (scale 1000)
    writeFixed16(conf.foc_observer_offset, 1000);

    // 64–65) float32_auto
    writeFloat32Auto(parts, conf.foc_duty_dowmramp_kp);
    writeFloat32Auto(parts, conf.foc_duty_dowmramp_ki);

    // 66) float32_auto
    writeFloat32Auto(parts, conf.foc_openloop_rpm);

    // 67) float16 fixed (scale 1000)
    writeFixed16(conf.foc_openloop_rpm_low, 1000);

    // 68–69) float32_auto
    writeFloat32Auto(parts, conf.foc_d_gain_scale_start);
    writeFloat32Auto(parts, conf.foc_d_gain_scale_max_mod);

    // 70–73) float16 fixed (scale 100)
    writeFixed16(conf.foc_sl_openloop_hyst,      100);
    writeFixed16(conf.foc_sl_openloop_time_lock, 100);
    writeFixed16(conf.foc_sl_openloop_time_ramp, 100);
    writeFixed16(conf.foc_sl_openloop_time,      100);

    // 74) foc_hall_table (8×uint8)
    for (let i = 0; i < 8; i++) writeUInt8(conf.foc_hall_table[i]);

    // 75–76) float32_auto
    writeFloat32Auto(parts, conf.foc_hall_interp_erpm);
    writeFloat32Auto(parts, conf.foc_sl_erpm);

    // 77–78) uint8
    writeUInt8(conf.foc_sample_v0_v7);
    writeUInt8(conf.foc_sample_high_current);

    // 79) float16 fixed (scale 1000)
    writeFixed16(conf.foc_sat_comp, 1000);

    // 80) uint8
    writeUInt8(conf.foc_temp_comp);

    // 81) float16 fixed (scale 100)
    writeFixed16(conf.foc_temp_comp_base_temp, 100);

    // 82) float16 fixed (scale 10000)
    writeFixed16(conf.foc_current_filter_const, 10000);

    // 83–84) uint8
    writeUInt8(conf.foc_cc_decoupling);
    writeUInt8(conf.foc_observer_type);

    // 85–88) float32_auto
    writeFloat32Auto(parts, conf.foc_hfi_voltage_start);
    writeFloat32Auto(parts, conf.foc_hfi_voltage_run);
    writeFloat32Auto(parts, conf.foc_hfi_voltage_max);
    writeFloat32Auto(parts, conf.foc_sl_erpm_hfi);

    // 89) uint16
    writeUInt16(conf.foc_hfi_start_samples);

    // 90) float32_auto
    writeFloat32Auto(parts, conf.foc_hfi_obs_ovr_sec);

    // 91–92) uint8
    writeUInt8(conf.foc_hfi_samples);
    writeUInt8(conf.foc_offsets_cal_on_boot);

    // 93–95) float32_auto array
    for (let i = 0; i < 3; i++) writeFloat32Auto(parts, conf.foc_offsets_current[i]);

    // 96–98) float16 fixed (scale 10000)
    for (let i = 0; i < 3; i++) writeFixed16(conf.foc_offsets_voltage[i], 10000);

    // 99–101) float16 fixed (scale 10000)
    for (let i = 0; i < 3; i++) writeFixed16(conf.foc_offsets_voltage_undriven[i], 10000);

    // 102) uint8
    writeUInt8(conf.foc_phase_filter_enable);

    // 103) float32_auto
    writeFloat32Auto(parts, conf.foc_phase_filter_max_erpm);

    // 104) uint8
    writeUInt8(conf.foc_mtpa_mode);

    // 105) float32_auto
    writeFloat32Auto(parts, conf.foc_fw_current_max);

    // 106–108) float16 fixed
    writeFixed16(conf.foc_fw_duty_start,         10000);
    writeFixed16(conf.foc_fw_ramp_time,          1000);
    writeFixed16(conf.foc_fw_q_current_factor,   10000);

    // 109–110) int16
    writeInt16(conf.gpd_buffer_notify_left);
    writeInt16(conf.gpd_buffer_interpol);

    // 111) float16 fixed (scale 10000)
    writeFixed16(conf.gpd_current_filter_const, 10000);

    // 112–113) float32_auto
    writeFloat32Auto(parts, conf.gpd_current_kp);
    writeFloat32Auto(parts, conf.gpd_current_ki);

    // 114) uint8
    writeUInt8(conf.sp_pid_loop_rate);

    // 115–117) float32_auto
    writeFloat32Auto(parts, conf.s_pid_kp);
    writeFloat32Auto(parts, conf.s_pid_ki);
    writeFloat32Auto(parts, conf.s_pid_kd);

    // 118) float16 fixed (scale 10000)
    writeFixed16(conf.s_pid_kd_filter, 10000);

    // 119) float32_auto
    writeFloat32Auto(parts, conf.s_pid_min_erpm);

    // 120) uint8
    writeUInt8(conf.s_pid_allow_braking);

    // 121) float32_auto
    writeFloat32Auto(parts, conf.s_pid_ramp_erpms_s);

    // 122–124) float32_auto
    writeFloat32Auto(parts, conf.p_pid_kp);
    writeFloat32Auto(parts, conf.p_pid_ki);
    writeFloat32Auto(parts, conf.p_pid_kd);

    // 125–126) float32_auto
    writeFloat32Auto(parts, conf.p_pid_kd_proc);
    writeFloat32Auto(parts, conf.p_pid_kd_filter);

    // 127) float32_auto
    writeFloat32Auto(parts, conf.p_pid_ang_div);

    // 128) float16 fixed (scale 10)
    writeFixed16(conf.p_pid_gain_dec_angle, 10);

    // 129) float32_auto
    writeFloat32Auto(parts, conf.p_pid_offset);

    // 130–133) float32_auto
    writeFloat32Auto(parts, conf.cc_startup_boost_duty);
    writeFloat32Auto(parts, conf.cc_min_current);
    writeFloat32Auto(parts, conf.cc_gain);
    writeFloat32Auto(parts, conf.cc_ramp_step_max);

    // 134) int32
    const b32 = Buffer.allocUnsafe(4);
    b32.writeInt32BE(conf.m_fault_stop_time_ms, 0);
    parts.push(b32);

    // 135–136) float32_auto
    writeFloat32Auto(parts, conf.m_duty_ramp_step);
    writeFloat32Auto(parts, conf.m_current_backoff_gain);

    // 137) uint32
    writeUInt32(conf.m_encoder_counts);

    // 138–140) uint8
    writeUInt8(conf.m_sensor_port_mode);
    writeUInt8(conf.m_invert_direction);
    writeUInt8(conf.m_drv8301_oc_mode);

    // 141) uint8
    writeUInt8(conf.m_drv8301_oc_adj);

    // 142–144) float32_auto
    writeFloat32Auto(parts, conf.m_bldc_f_sw_min);
    writeFloat32Auto(parts, conf.m_bldc_f_sw_max);
    writeFloat32Auto(parts, conf.m_dc_f_sw);

    // 145) float32_auto
    writeFloat32Auto(parts, conf.m_ntc_motor_beta);

    // 146–147) uint8
    writeUInt8(conf.m_out_aux_mode);
    writeUInt8(convertEnumToIndex(conf.m_motor_temp_sens_type, METADATA_MC.m_motor_temp_sens_type.enums));

    // 148) float32_auto
    writeFloat32Auto(parts, conf.m_ptc_motor_coeff);

    // 149–150) uint8
    writeUInt8(conf.m_hall_extra_samples);
    writeUInt8(conf.si_motor_poles);

    // 151–152) float32_auto
    writeFloat32Auto(parts, conf.si_gear_ratio);
    writeFloat32Auto(parts, conf.si_wheel_diameter);

    // 153–154) uint8
    writeUInt8(conf.si_battery_type);
    // wegen einschrengenden enum-Werte + 10
    writeUInt8(convertEnumToIndex(conf.si_battery_cells, METADATA_MC.si_battery_cells.enums) + 10);

    // 155–156) float32_auto
    writeFloat32Auto(parts, conf.si_battery_ah);
    writeFloat32Auto(parts, conf.si_motor_nl_current);

    // 157) uint8
    writeUInt8(conf.bms.type);

    // 158–161) float16 fixed
    writeFixed16(conf.bms.t_limit_start,   100);
    writeFixed16(conf.bms.t_limit_end,     100);
    writeFixed16(conf.bms.soc_limit_start, 1000);
    writeFixed16(conf.bms.soc_limit_end,   1000);

    // 162) uint8
    writeUInt8(conf.bms.fwd_can_mode);

    // Concatenate and return a single Buffer
    return Buffer.concat(parts);  // Korrigiert: offset zu parts geändert
}

/**
 * Serialisiert eine MCCONF-Konfiguration in der Version 2
 * @param {Object} conf - Die zu serialisierende Konfiguration
 * @param {number} signature - Die Signatur
 * @returns {Buffer} Die serialisierten Daten
 */
function serializeMcconf_V2(conf, signature) {
    // Implementierung für V2 Serialisierung kommt hier
    return Buffer.alloc(0);
}

module.exports = {
    serializeMcconf_V1,
    serializeMcconf_V2
};