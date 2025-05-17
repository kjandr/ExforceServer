const {createBufferWriters} = require("./helper");

function serializeAppconf_V1(conf, signature) {
    const writers = createBufferWriters();
    const {
        writeUInt8, writeUInt16, writeInt16, writeUInt32, writeInt32,
        writeFloat16, writeFloat32Auto, writeByteArray
    } = writers;

    // Signature
    writeUInt32(signature);

    // Allgemeine Konfiguration
    writeUInt8(conf.controller_id);
    writeUInt32(conf.timeout_msec);
    writeFloat32Auto(conf.timeout_brake_current);
    writeUInt8(conf.send_can_status);
    writeUInt16(conf.send_can_status_rate_hz);
    writeUInt8(conf.can_baud_rate);
    writeUInt8(conf.pairing_done);
    writeUInt8(conf.permanent_uart_enabled);
    writeUInt8(conf.shutdown_mode);
    writeUInt8(conf.can_mode);
    writeUInt8(conf.uavcan_esc_index);
    writeUInt8(conf.uavcan_raw_mode);
    writeFloat32Auto(conf.uavcan_raw_rpm_max);
    writeUInt8(conf.servo_out_enable);
    writeUInt8(conf.kill_sw_mode);
    writeUInt8(conf.app_to_use);

    // PPM APP Konfiguration
    writeUInt8(conf.app_ppm_conf.ctrl_type);
    writeFloat32Auto(conf.app_ppm_conf.pid_max_erpm);
    writeFloat32Auto(conf.app_ppm_conf.hyst);
    writeFloat32Auto(conf.app_ppm_conf.pulse_start);
    writeFloat32Auto(conf.app_ppm_conf.pulse_end);
    writeFloat32Auto(conf.app_ppm_conf.pulse_center);
    writeUInt8(conf.app_ppm_conf.median_filter);
    writeUInt8(conf.app_ppm_conf.safe_start);
    writeFloat32Auto(conf.app_ppm_conf.throttle_exp);
    writeFloat32Auto(conf.app_ppm_conf.throttle_exp_brake);
    writeUInt8(conf.app_ppm_conf.throttle_exp_mode);
    writeFloat32Auto(conf.app_ppm_conf.ramp_time_pos);
    writeFloat32Auto(conf.app_ppm_conf.ramp_time_neg);
    writeUInt8(conf.app_ppm_conf.multi_esc);
    writeUInt8(conf.app_ppm_conf.tc);
    writeFloat32Auto(conf.app_ppm_conf.tc_max_diff);
    writeFloat16(conf.app_ppm_conf.max_erpm_for_dir, 1);
    writeFloat32Auto(conf.app_ppm_conf.smart_rev_max_duty);
    writeFloat32Auto(conf.app_ppm_conf.smart_rev_ramp_time);

    // ADC APP Konfiguration
    writeUInt8(conf.app_adc_conf.ctrl_type);
    writeFloat32Auto(conf.app_adc_conf.hyst);
    writeFloat32Auto(conf.app_adc_conf.voltage_start);
    writeFloat32Auto(conf.app_adc_conf.voltage_end);
    writeFloat32Auto(conf.app_adc_conf.voltage_center);
    writeFloat32Auto(conf.app_adc_conf.voltage2_start);
    writeFloat32Auto(conf.app_adc_conf.voltage2_end);
    writeUInt8(conf.app_adc_conf.use_filter);
    writeUInt8(conf.app_adc_conf.safe_start);
    writeUInt8(conf.app_adc_conf.cc_button_inverted);
    writeUInt8(conf.app_adc_conf.rev_button_inverted);
    writeUInt8(conf.app_adc_conf.voltage_inverted);
    writeUInt8(conf.app_adc_conf.voltage2_inverted);
    writeFloat32Auto(conf.app_adc_conf.throttle_exp);
    writeFloat32Auto(conf.app_adc_conf.throttle_exp_brake);
    writeUInt8(conf.app_adc_conf.throttle_exp_mode);
    writeFloat32Auto(conf.app_adc_conf.ramp_time_pos);
    writeFloat32Auto(conf.app_adc_conf.ramp_time_neg);
    writeUInt8(conf.app_adc_conf.multi_esc);
    writeUInt8(conf.app_adc_conf.tc);
    writeFloat32Auto(conf.app_adc_conf.tc_max_diff);
    writeUInt16(conf.app_adc_conf.update_rate_hz);

    // UART-Baudrate
    writeUInt32(conf.app_uart_baudrate);

    // CHUK APP Konfiguration
    writeUInt8(conf.app_chuk_conf.ctrl_type);
    writeFloat32Auto(conf.app_chuk_conf.hyst);
    writeFloat32Auto(conf.app_chuk_conf.ramp_time_pos);
    writeFloat32Auto(conf.app_chuk_conf.ramp_time_neg);
    writeFloat32Auto(conf.app_chuk_conf.stick_erpm_per_s_in_cc);
    writeFloat32Auto(conf.app_chuk_conf.throttle_exp);
    writeFloat32Auto(conf.app_chuk_conf.throttle_exp_brake);
    writeUInt8(conf.app_chuk_conf.throttle_exp_mode);
    writeUInt8(conf.app_chuk_conf.multi_esc);
    writeUInt8(conf.app_chuk_conf.tc);
    writeFloat32Auto(conf.app_chuk_conf.tc_max_diff);
    writeUInt8(conf.app_chuk_conf.use_smart_rev);
    writeFloat32Auto(conf.app_chuk_conf.smart_rev_max_duty);
    writeFloat32Auto(conf.app_chuk_conf.smart_rev_ramp_time);

    // NRF APP Konfiguration
    writeUInt8(conf.app_nrf_conf.speed);
    writeUInt8(conf.app_nrf_conf.power);
    writeUInt8(conf.app_nrf_conf.crc_type);
    writeUInt8(conf.app_nrf_conf.retry_delay);
    writeUInt8(conf.app_nrf_conf.retries);
    writeUInt8(conf.app_nrf_conf.channel);
    writeUInt8(conf.app_nrf_conf.address[0]);
    writeUInt8(conf.app_nrf_conf.address[1]);
    writeUInt8(conf.app_nrf_conf.address[2]);
    writeUInt8(conf.app_nrf_conf.send_crc_ack);

    // Balance APP Konfiguration
    writeFloat32Auto(conf.app_balance_conf.kp);
    writeFloat32Auto(conf.app_balance_conf.ki);
    writeFloat32Auto(conf.app_balance_conf.kd);
    writeUInt16(conf.app_balance_conf.hertz);
    writeUInt16(conf.app_balance_conf.loop_time_filter);
    writeFloat32Auto(conf.app_balance_conf.fault_pitch);
    writeFloat32Auto(conf.app_balance_conf.fault_roll);
    writeFloat32Auto(conf.app_balance_conf.fault_duty);
    writeFloat32Auto(conf.app_balance_conf.fault_adc1);
    writeFloat32Auto(conf.app_balance_conf.fault_adc2);
    writeUInt16(conf.app_balance_conf.fault_delay_pitch);
    writeUInt16(conf.app_balance_conf.fault_delay_roll);
    writeUInt16(conf.app_balance_conf.fault_delay_duty);
    writeUInt16(conf.app_balance_conf.fault_delay_switch_half);
    writeUInt16(conf.app_balance_conf.fault_delay_switch_full);
    writeUInt16(conf.app_balance_conf.fault_adc_half_erpm);
    writeFloat16(conf.app_balance_conf.tiltback_duty_angle, 100);
    writeFloat16(conf.app_balance_conf.tiltback_duty_speed, 100);
    writeFloat16(conf.app_balance_conf.tiltback_duty, 1000);
    writeFloat16(conf.app_balance_conf.tiltback_hv_angle, 100);
    writeFloat16(conf.app_balance_conf.tiltback_hv_speed, 100);
    writeFloat32Auto(conf.app_balance_conf.tiltback_hv);
    writeFloat16(conf.app_balance_conf.tiltback_lv_angle, 100);
    writeFloat16(conf.app_balance_conf.tiltback_lv_speed, 100);
    writeFloat32Auto(conf.app_balance_conf.tiltback_lv);
    writeFloat16(conf.app_balance_conf.tiltback_return_speed, 100);
    writeFloat32Auto(conf.app_balance_conf.tiltback_constant);
    writeUInt16(conf.app_balance_conf.tiltback_constant_erpm);
    writeFloat32Auto(conf.app_balance_conf.tiltback_variable);
    writeFloat32Auto(conf.app_balance_conf.tiltback_variable_max);
    writeFloat16(conf.app_balance_conf.noseangling_speed, 100);
    writeFloat32Auto(conf.app_balance_conf.startup_pitch_tolerance);
    writeFloat32Auto(conf.app_balance_conf.startup_roll_tolerance);
    writeFloat32Auto(conf.app_balance_conf.startup_speed);
    writeFloat32Auto(conf.app_balance_conf.deadzone);
    writeUInt8(conf.app_balance_conf.multi_esc);
    writeFloat32Auto(conf.app_balance_conf.yaw_kp);
    writeFloat32Auto(conf.app_balance_conf.yaw_ki);
    writeFloat32Auto(conf.app_balance_conf.yaw_kd);
    writeFloat32Auto(conf.app_balance_conf.roll_steer_kp);
    writeFloat32Auto(conf.app_balance_conf.roll_steer_erpm_kp);
    writeFloat32Auto(conf.app_balance_conf.brake_current);
    writeUInt16(conf.app_balance_conf.brake_timeout);
    writeFloat32Auto(conf.app_balance_conf.yaw_current_clamp);
    writeUInt16(conf.app_balance_conf.kd_pt1_lowpass_frequency);
    writeUInt16(conf.app_balance_conf.kd_pt1_highpass_frequency);
    writeFloat32Auto(conf.app_balance_conf.kd_biquad_lowpass);
    writeFloat32Auto(conf.app_balance_conf.kd_biquad_highpass);
    writeFloat32Auto(conf.app_balance_conf.booster_angle);
    writeFloat32Auto(conf.app_balance_conf.booster_ramp);
    writeFloat32Auto(conf.app_balance_conf.booster_current);
    writeFloat32Auto(conf.app_balance_conf.torquetilt_start_current);
    writeFloat32Auto(conf.app_balance_conf.torquetilt_angle_limit);
    writeFloat32Auto(conf.app_balance_conf.torquetilt_on_speed);
    writeFloat32Auto(conf.app_balance_conf.torquetilt_off_speed);
    writeFloat32Auto(conf.app_balance_conf.torquetilt_strength);
    writeFloat32Auto(conf.app_balance_conf.torquetilt_filter);
    writeFloat32Auto(conf.app_balance_conf.turntilt_strength);
    writeFloat32Auto(conf.app_balance_conf.turntilt_angle_limit);
    writeFloat32Auto(conf.app_balance_conf.turntilt_start_angle);
    writeUInt16(conf.app_balance_conf.turntilt_start_erpm);
    writeFloat32Auto(conf.app_balance_conf.turntilt_speed);
    writeUInt16(conf.app_balance_conf.turntilt_erpm_boost);
    writeUInt16(conf.app_balance_conf.turntilt_erpm_boost_end);

    // PAS APP Konfiguration
    writeUInt8(conf.app_pas_conf.ctrl_type);
    writeUInt8(conf.app_pas_conf.sensor_type);
    writeFloat16(conf.app_pas_conf.current_scaling, 1000);
    writeFloat16(conf.app_pas_conf.pedal_rpm_start, 10);
    writeFloat16(conf.app_pas_conf.pedal_rpm_end, 10);
    writeUInt8(conf.app_pas_conf.invert_pedal_direction);
    writeUInt16(conf.app_pas_conf.magnets);
    writeUInt8(conf.app_pas_conf.use_filter);
    writeFloat16(conf.app_pas_conf.ramp_time_pos, 100);
    writeFloat16(conf.app_pas_conf.ramp_time_neg, 100);
    writeUInt16(conf.app_pas_conf.update_rate_hz);

    // IMU Konfiguration
    writeUInt8(conf.imu_conf.type);
    writeUInt8(conf.imu_conf.mode);
    writeUInt16(conf.imu_conf.sample_rate_hz);
    writeFloat32Auto(conf.imu_conf.accel_confidence_decay);
    writeFloat32Auto(conf.imu_conf.mahony_kp);
    writeFloat32Auto(conf.imu_conf.mahony_ki);
    writeFloat32Auto(conf.imu_conf.madgwick_beta);
    writeFloat32Auto(conf.imu_conf.rot_roll);
    writeFloat32Auto(conf.imu_conf.rot_pitch);
    writeFloat32Auto(conf.imu_conf.rot_yaw);
    writeFloat32Auto(conf.imu_conf.accel_offsets[0]);
    writeFloat32Auto(conf.imu_conf.accel_offsets[1]);
    writeFloat32Auto(conf.imu_conf.accel_offsets[2]);
    writeFloat32Auto(conf.imu_conf.gyro_offsets[0]);
    writeFloat32Auto(conf.imu_conf.gyro_offsets[1]);
    writeFloat32Auto(conf.imu_conf.gyro_offsets[2]);

    return writers.getBuffer();
}

module.exports = { serializeAppconf_V1 };
