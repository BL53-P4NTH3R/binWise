/**
 * BinWise — main.ino
 * ─────────────────────────────────────────────────────────────────
 * Main firmware entry point for the BinWise sensor node.
 *
 * Board  : ESP32-S3 DevKitC-1
 * IDE    : Arduino IDE 2.x
 *
 * Operation cycle (WiFi bench-test build):
 *   1. ESP32-S3 wakes from deep sleep
 *   2. setup() runs — all logic executes here
 *   3. HC-SR04 reads bin fill level (5 averaged readings)
 *   4. ESP32-S3 connects to WiFi (WIFI_SSID / WIFI_PASSWORD in config.h)
 *   5. HTTP POST to /api/ingest with fill_pct, battery_pct, rssi
 *   6. LEDs update to show current fill status
 *   7. ESP32-S3 enters deep sleep for SLEEP_SECONDS (5 minutes)
 *   8. Repeat from step 1
 *
 * NOTE: This is a temporary WiFi transmit path (wifi_handler.h/.cpp)
 * used for bench testing while the SIM800L power supply issue is
 * being resolved. To revert to GSM: swap the "wifi_handler.h"
 * include back to "gsm_handler.h" and swap the wifiInit/wifiGetRSSI/
 * wifiPostReading/wifiPowerDown calls below back to their gsm*
 * equivalents — function shapes are identical.
 *
 * Note: loop() is intentionally empty. Deep sleep restarts the
 * chip and re-runs setup() on each wake cycle. This is the
 * correct pattern for battery-powered IoT nodes.
 *
 * Author : Blue Panther — ABU Zaria Final Year Project 2026
 * ─────────────────────────────────────────────────────────────────
 */

#include <Arduino.h>
#include "config.h"
#include "ultrasonic_handler.h"
#include "wifi_handler.h"

// ─────────────────────────────────────────────────────────────────
// DEEP SLEEP COUNTER
// RTC memory survives deep sleep. Use to count total readings.
// ─────────────────────────────────────────────────────────────────
RTC_DATA_ATTR int boot_count = 0;

// ─────────────────────────────────────────────────────────────────
// FORWARD DECLARATIONS
// ─────────────────────────────────────────────────────────────────
void initLeds();
void updateLeds(float fill_pct);
void ledSelfTest();
void enterDeepSleep();
void printBanner();
float readSimulatedBattery();

// ─────────────────────────────────────────────────────────────────
// SETUP — all logic runs here
// ─────────────────────────────────────────────────────────────────

void setup() {

#if DEBUG_SERIAL
  Serial.begin(SERIAL_BAUD);
  delay(500);
  printBanner();
#endif

  boot_count++;
  LOGF("[BOOT] Wake #%d  (SLEEP_SECONDS = %d)\n",
       boot_count, SLEEP_SECONDS);

  // ── Step 1: Initialise hardware ─────────────────────────────────
  initLeds();
  ultrasonicInit();

  // LED self-test on first boot only
  if (boot_count == 1) {
    ledSelfTest();
  }

  // ── Step 2: Read fill level ─────────────────────────────────────
  LOGLN("[CYCLE] Reading fill level...");
  float fill_pct = getFillPct();

  // ── Step 3: Simulate battery reading ────────────────────────────
  // In production: read ADC connected to TP4056 OUT+ via divider
  // For now: returns a stable 85% simulation value
  // Replace with real ADC read when voltage divider is wired to ADC
  float battery_pct = readSimulatedBattery();

  // ── Step 4: Update status LEDs ──────────────────────────────────
  updateLeds(fill_pct);

  // ── Step 5: Connect to WiFi and transmit ────────────────────────
  LOGLN("[CYCLE] Connecting to WiFi...");
  bool wifi_ready = wifiInit();

  int http_code = -1;
  int rssi_dbm  = -999;

  if (wifi_ready) {
    rssi_dbm  = wifiGetRSSI();
    http_code = wifiPostReading(fill_pct, battery_pct, rssi_dbm);

    if (http_code == 201) {
      LOGLN("[CYCLE] ✓ Reading sent to BinWise backend successfully");
      // Flash TX LED to confirm successful transmission
      digitalWrite(PIN_LED_TX, HIGH);
      delay(500);
      digitalWrite(PIN_LED_TX, LOW);
    } else {
      LOGF("[CYCLE] ✗ Transmission failed (code: %d)\n", http_code);
    }

    // Power down WiFi before sleep to save battery
    wifiPowerDown();

  } else {
    LOGLN("[CYCLE] ✗ WiFi connect failed — skipping transmission");
    LOGLN("[CYCLE] Node will retry on next wake cycle");
  }

  // ── Step 6: Log summary ─────────────────────────────────────────
  LOGLN("[SUMMARY] ──────────────────────────────────────");
  LOGF("[SUMMARY] Node ID    : %s\n",   NODE_ID);
  LOGF("[SUMMARY] Fill level : %.1f%%\n", fill_pct);
  LOGF("[SUMMARY] Battery    : %.1f%%\n", battery_pct);
  LOGF("[SUMMARY] RSSI       : %d dBm\n", rssi_dbm);
  LOGF("[SUMMARY] HTTP code  : %d\n",    http_code);
  LOGF("[SUMMARY] Boot count : %d\n",   boot_count);
  LOGLN("[SUMMARY] ──────────────────────────────────────");

  // ── Step 7: Enter deep sleep ────────────────────────────────────
  enterDeepSleep();
}

// ─────────────────────────────────────────────────────────────────
// LOOP — intentionally empty
// All logic runs in setup(). Deep sleep restarts setup() each wake.
// ─────────────────────────────────────────────────────────────────

void loop() {
  // Nothing here — deep sleep pattern means loop() never runs
}

// ─────────────────────────────────────────────────────────────────
// LED FUNCTIONS
// ─────────────────────────────────────────────────────────────────

void initLeds() {
  pinMode(PIN_LED_OVERFLOW, OUTPUT);
  pinMode(PIN_LED_WARNING,  OUTPUT);
  pinMode(PIN_LED_NORMAL,   OUTPUT);
  pinMode(PIN_LED_TX,       OUTPUT);

  // All LEDs off at boot
  digitalWrite(PIN_LED_OVERFLOW, LOW);
  digitalWrite(PIN_LED_WARNING,  LOW);
  digitalWrite(PIN_LED_NORMAL,   LOW);
  digitalWrite(PIN_LED_TX,       LOW);
}

void updateLeds(float fill_pct) {
  // Clear all status LEDs first
  digitalWrite(PIN_LED_OVERFLOW, LOW);
  digitalWrite(PIN_LED_WARNING,  LOW);
  digitalWrite(PIN_LED_NORMAL,   LOW);

  if (fill_pct > OVERFLOW_THRESHOLD_PCT) {
    // Overflow — pulse red 3 times then hold ON
    LOGLN("[LED]  OVERFLOW — pulsing red");
    for (int i = 0; i < 3; i++) {
      digitalWrite(PIN_LED_OVERFLOW, HIGH); delay(200);
      digitalWrite(PIN_LED_OVERFLOW, LOW);  delay(200);
    }
    digitalWrite(PIN_LED_OVERFLOW, HIGH);

  } else if (fill_pct >= WARNING_THRESHOLD_PCT) {
    LOGLN("[LED]  WARNING — yellow on");
    digitalWrite(PIN_LED_WARNING, HIGH);

  } else {
    LOGLN("[LED]  NORMAL — green on");
    digitalWrite(PIN_LED_NORMAL, HIGH);
  }
}

void ledSelfTest() {
  LOGLN("[BOOT] LED self-test...");
  digitalWrite(PIN_LED_OVERFLOW, HIGH); delay(300);
  digitalWrite(PIN_LED_WARNING,  HIGH); delay(300);
  digitalWrite(PIN_LED_NORMAL,   HIGH); delay(300);
  digitalWrite(PIN_LED_TX,       HIGH); delay(300);
  // All off
  digitalWrite(PIN_LED_OVERFLOW, LOW);
  digitalWrite(PIN_LED_WARNING,  LOW);
  digitalWrite(PIN_LED_NORMAL,   LOW);
  digitalWrite(PIN_LED_TX,       LOW);
  delay(300);
  LOGLN("[BOOT] ✓ LED self-test complete");
}

// ─────────────────────────────────────────────────────────────────
// BATTERY READING
// ─────────────────────────────────────────────────────────────────

float readSimulatedBattery() {
  /*
   * Production implementation:
   * ────────────────────────────────────────────────────────────────
   * Wire a voltage divider from TP4056 OUT+ to an ADC-capable
   * GPIO pin (e.g. GPIO35). Use 100kΩ and 100kΩ to halve the
   * voltage, then map the ADC reading to battery percentage.
   *
   * Example real implementation:
   *   int raw = analogRead(35);           // 0–4095 on ESP32-S3
   *   float voltage = (raw / 4095.0f) * 3.3f * 2.0f; // × 2 for divider
   *   // Li-Ion: 3.0V = 0%, 4.2V = 100%
   *   float pct = ((voltage - 3.0f) / (4.2f - 3.0f)) * 100.0f;
   *   return constrain(pct, 0.0f, 100.0f);
   *
   * For now, returns 85.0 as a stable placeholder.
   * Replace this function body with the above when your ADC
   * voltage divider is wired.
   */
  return 85.0f;
}

// ─────────────────────────────────────────────────────────────────
// DEEP SLEEP
// ─────────────────────────────────────────────────────────────────

void enterDeepSleep() {
  LOGF("[SLEEP] Entering deep sleep for %d seconds...\n", SLEEP_SECONDS);

  // Allow Serial to flush before sleep
  delay(100);
  Serial.flush();

  // Configure wake timer: microseconds
  esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_SECONDS * 1000000ULL);

  // Enter deep sleep — execution stops here
  // Next execution starts at setup() on wake
  esp_deep_sleep_start();
}

// ─────────────────────────────────────────────────────────────────
// BOOT BANNER
// ─────────────────────────────────────────────────────────────────

void printBanner() {
  Serial.println();
  Serial.println(F("╔══════════════════════════════════════════════╗"));
  Serial.println(F("║       BinWise — Sensor Node Firmware         ║"));
  Serial.println(F("║       ABU Zaria · Samaru Campus · 2026       ║"));
  Serial.println(F("╠══════════════════════════════════════════════╣"));
  Serial.print  (F("║  Node ID  : ")); Serial.println(F(NODE_ID));
  Serial.print  (F("║  API host : ")); Serial.println(F(API_HOST));
  Serial.print  (F("║  Bin ht.  : ")); Serial.print(BIN_HEIGHT_CM);
  Serial.println(F(" cm"));
  Serial.print  (F("║  Sleep    : ")); Serial.print(SLEEP_SECONDS);
  Serial.println(F(" s"));
  Serial.println(F("╚══════════════════════════════════════════════╝"));
  Serial.println();
}
