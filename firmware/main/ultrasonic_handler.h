/**
 * BinWise — ultrasonic_handler.h
 * ─────────────────────────────────────────────────────────────────
 * HC-SR04 ultrasonic sensor interface.
 * Reads distance, averages multiple readings, converts to fill %.
 * ─────────────────────────────────────────────────────────────────
 */

#ifndef ULTRASONIC_HANDLER_H
#define ULTRASONIC_HANDLER_H

#include <Arduino.h>
#include "config.h"

/**
 * Initialise HC-SR04 pins.
 * Call once in setup().
 */
void ultrasonicInit();

/**
 * Take NUM_READINGS distance measurements, discard outliers,
 * and return the averaged distance in centimetres.
 *
 * Returns -1.0 if all readings are invalid (sensor fault).
 */
float ultrasonicReadCm();

/**
 * Convert a distance reading to a fill percentage.
 *
 * Formula:
 *   usable_height = BIN_HEIGHT_CM - SENSOR_OFFSET_CM
 *   fill_pct = ((usable_height - (dist - SENSOR_OFFSET_CM))
 *               / usable_height) * 100
 *
 * Clamped to 0–100. Returns 0 if dist is invalid (-1).
 */
float distanceToFillPct(float distance_cm);

/**
 * Convenience wrapper: read distance and return fill percentage
 * in a single call. Returns 0.0 on sensor fault.
 */
float getFillPct();

#endif // ULTRASONIC_HANDLER_H
