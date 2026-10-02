/**
 * BinWise — ultrasonic_handler.cpp
 * ─────────────────────────────────────────────────────────────────
 * Implementation of HC-SR04 distance sensing and fill % calculation.
 * ─────────────────────────────────────────────────────────────────
 */

#include "ultrasonic_handler.h"

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

void ultrasonicInit() {
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);
  delay(100);
  LOGLN("[SENSOR] HC-SR04 initialised");
  LOGF("[SENSOR] Pins: TRIG=%d ECHO=%d initial_echo=%d\n",
       PIN_TRIG, PIN_ECHO, digitalRead(PIN_ECHO));
}

// ─────────────────────────────────────────────────────────────────
// SINGLE RAW READING
// Returns distance in cm, or -1.0 on timeout / out-of-range
// ─────────────────────────────────────────────────────────────────

static float takeSingleReading() {
  // Ensure TRIG is LOW before pulse
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);

  // Send 10µs HIGH pulse on TRIG
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Measure ECHO pulse duration — 30ms timeout
  // 30ms = max range ~5m, well beyond HC-SR04's 4m limit
  long duration_us = pulseIn(PIN_ECHO, HIGH, 30000UL);

    LOGF("[SENSOR] Echo pin after pulse: %d, duration: %ld us\n",
      digitalRead(PIN_ECHO), duration_us);

  if (duration_us == 0) {
    return -1.0f;  // timeout — no echo received
  }

  // Convert duration to distance
  // Speed of sound = 343 m/s = 0.0343 cm/µs
  // Distance = (duration / 2) * 0.0343
  // Simplified: distance = duration / 58.2
  float dist_cm = (float)duration_us / 58.2f;

  // HC-SR04 valid range: 2cm to 400cm
  if (dist_cm < 2.0f || dist_cm > 400.0f) {
    return -1.0f;  // out of range
  }

  return dist_cm;
}

// ─────────────────────────────────────────────────────────────────
// AVERAGED READING
// Takes NUM_READINGS samples, discards invalid ones, returns mean
// ─────────────────────────────────────────────────────────────────

float ultrasonicReadCm() {
  float readings[NUM_READINGS];
  int   valid_count = 0;
  float total       = 0.0f;

  for (int i = 0; i < NUM_READINGS; i++) {
    float r = takeSingleReading();
    if (r > 0.0f) {
      readings[valid_count] = r;
      total += r;
      valid_count++;
    }
    delay(READING_DELAY_MS);  // HC-SR04 needs ~60ms between pulses
  }

  if (valid_count == 0) {
    LOGLN("[SENSOR] ERROR: All readings invalid — sensor fault");
    return -1.0f;
  }

  float average = total / (float)valid_count;

  LOGF("[SENSOR] Distance: %.1f cm  (%d/%d valid readings)\n",
       average, valid_count, NUM_READINGS);

  return average;
}

// ─────────────────────────────────────────────────────────────────
// DISTANCE TO FILL PERCENTAGE
// ─────────────────────────────────────────────────────────────────

float distanceToFillPct(float distance_cm) {
  if (distance_cm < 0.0f) {
    return 0.0f;  // sensor fault — report 0 rather than garbage
  }

  float usable_height = (float)(BIN_HEIGHT_CM - SENSOR_OFFSET_CM);

  // Distance from sensor to waste surface
  // When empty: distance ≈ BIN_HEIGHT_CM → fill ≈ 0%
  // When full:  distance ≈ SENSOR_OFFSET_CM → fill ≈ 100%
  float effective_dist = distance_cm - (float)SENSOR_OFFSET_CM;
  float fill = ((usable_height - effective_dist) / usable_height) * 100.0f;

  // Clamp to valid range
  if (fill < 0.0f)   fill = 0.0f;
  if (fill > 100.0f) fill = 100.0f;

  LOGF("[SENSOR] Fill level: %.1f%%\n", fill);

  return fill;
}

// ─────────────────────────────────────────────────────────────────
// CONVENIENCE WRAPPER
// ─────────────────────────────────────────────────────────────────

float getFillPct() {
  float dist = ultrasonicReadCm();
  return distanceToFillPct(dist);
}
