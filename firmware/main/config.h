/**
 * BinWise — config.h
 * ─────────────────────────────────────────────────────────────────
 * Central configuration file for the BinWise sensor node firmware.
 * All pin definitions, network settings, and thresholds live here.
 * Edit this file before flashing — nothing else needs changing for
 * a new deployment location.
 *
 * Board  : ESP32-S3 DevKitC-1
 * IDE    : Arduino IDE 2.x with ESP32 board support
 * Author : Blue Panther — ABU Zaria Final Year Project 2026
 * ─────────────────────────────────────────────────────────────────
 */

#ifndef CONFIG_H
#define CONFIG_H

// ═══════════════════════════════════════════════════════════════════
// NODE IDENTITY
// Must match the node_id registered in the BinWise backend database
// (sensor_nodes table). Format: US-Node-XXX
// ═══════════════════════════════════════════════════════════════════

#define NODE_ID          "US-Node-402"

// ═══════════════════════════════════════════════════════════════════
// BACKEND API
// API_HOST must be a BARE host or IP — no "http://" prefix.
// The "http://" scheme is added where the URL is built
// (gsm_handler.cpp / wifi_handler.cpp), so including it here as well
// produces a broken double-scheme URL like "http://http://...".
//
// If running locally during development with the WiFi test path:
// use your laptop's LAN IP (e.g. "192.168.1.105"), NOT "127.0.0.1" —
// on the ESP32, "127.0.0.1" means the ESP32 itself, not your laptop.
// ═══════════════════════════════════════════════════════════════════

#define API_HOST         "192.168.137.1"
#define API_PORT         8000
#define API_PATH         "/api/ingest"

// ═══════════════════════════════════════════════════════════════════
// WIFI SETTINGS — used by wifi_handler.h/.cpp for bench testing
// while the SIM800L power supply issue is being resolved.
// ═══════════════════════════════════════════════════════════════════

#define WIFI_SSID        "BL53-P4NTH3R#"
#define WIFI_PASSWORD    "4lph4T3ch13"

// ═══════════════════════════════════════════════════════════════════
// GSM / SIM SETTINGS — MTN Nigeria
// ═══════════════════════════════════════════════════════════════════

#define GSM_APN          "web.gprs.mtnnigeria.net"
#define GSM_USER         ""     // MTN Nigeria needs no username
#define GSM_PASS         ""     // MTN Nigeria needs no password
#define GSM_BAUD         9600   // SIM800L default baud rate

// ═══════════════════════════════════════════════════════════════════
// PIN DEFINITIONS — ESP32-S3 DevKitC-1
// ═══════════════════════════════════════════════════════════════════

// HC-SR04 ultrasonic sensor
#define PIN_TRIG         4      // TRIG — direct to GPIO4
#define PIN_ECHO         16     // ECHO — via 1kΩ+2kΩ voltage divider

// SIM800L GSM module (UART1)
#define PIN_SIM_TX       17     // ESP32 TX → SIM800L RXD
#define PIN_SIM_RX       18     // ESP32 RX ← SIM800L TXD

// Status LEDs (optional — remove if not using LEDs)
//
// IMPORTANT: On the ESP32-S3-DevKitC-1 N16R8 (16MB flash + 8MB PSRAM,
// both Octal SPI), GPIO26–GPIO37 are internally wired to the flash/
// PSRAM chips and are NOT usable as general-purpose GPIO. Toggling
// them crashes the chip (it corrupts its own code-fetch bus), which
// is why the board hung and hit a Task Watchdog reset inside
// initLeds(). Do not use any pin in the 26–37 range for anything.
#define PIN_LED_OVERFLOW 5      // Red   — fill > 80%   (moved off GPIO26)
#define PIN_LED_WARNING  6      // Yellow — fill 50–80% (moved off GPIO27)
#define PIN_LED_NORMAL   14     // Green  — fill < 50%
#define PIN_LED_TX       13     // Blue   — transmitting

// ═══════════════════════════════════════════════════════════════════
// BIN PHYSICAL PARAMETERS
// Measure your actual bin before deploying and update these values.
// ═══════════════════════════════════════════════════════════════════

#define BIN_HEIGHT_CM    80     // Internal bin height in centimetres
                                // Measure from sensor face to bin floor
#define SENSOR_OFFSET_CM  3    // Dead zone — HC-SR04 minimum range
                                // Keeps reading above 0 when nearly full

// ═══════════════════════════════════════════════════════════════════
// ALERT THRESHOLDS
// These must match the alert_settings values in your backend DB
// ═══════════════════════════════════════════════════════════════════

#define OVERFLOW_THRESHOLD_PCT  80.0f   // Above this → overflow alert
#define WARNING_THRESHOLD_PCT   50.0f   // Above this → warning state

// ═══════════════════════════════════════════════════════════════════
// TIMING
// ═══════════════════════════════════════════════════════════════════

// Deep sleep duration between readings
// 300 seconds = 5 minutes (production)
// Change to 30 for faster testing during development

// #define SLEEP_SECONDS    300
#define SLEEP_SECONDS    30

// Number of HC-SR04 readings to average per cycle (reduces noise)
#define NUM_READINGS     5

// Milliseconds to wait between individual readings
#define READING_DELAY_MS 60

// GSM command timeout in milliseconds
#define GSM_TIMEOUT_MS   10000

// Number of retry attempts if transmission fails (shared by
// GSM and WiFi transmit paths)
#define GSM_RETRY_COUNT  3

// ═══════════════════════════════════════════════════════════════════
// SERIAL DEBUG
// Set to 1 to enable detailed Serial Monitor output
// Set to 0 to disable (saves a small amount of power)
// ═══════════════════════════════════════════════════════════════════

#define DEBUG_SERIAL     1
#define SERIAL_BAUD      115200

#if DEBUG_SERIAL
  #define LOG(x)   Serial.print(x)
  #define LOGLN(x) Serial.println(x)
  #define LOGF(...)  Serial.printf(__VA_ARGS__)
#else
  #define LOG(x)
  #define LOGLN(x)
  #define LOGF(...)
#endif

#endif // CONFIG_H