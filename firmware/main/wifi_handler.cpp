/**
 * BinWise — wifi_handler.cpp
 * ─────────────────────────────────────────────────────────────────
 * WiFi + HTTPClient implementation of the transmit path, used for
 * bench testing in place of the SIM800L GSM path.
 *
 * IMPORTANT: The JSON payload built in wifiPostReading() is
 * byte-for-byte identical in structure to the one built in
 * gsmPostReading() (gsm_handler.cpp) — the backend's /api/ingest
 * schema doesn't need to know or care which transport sent it.
 * ─────────────────────────────────────────────────────────────────
 */

#include "wifi_handler.h"
#include <WiFi.h>
#include <HTTPClient.h>

// Max time to wait for WiFi association before giving up
static const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;

// ─────────────────────────────────────────────────────────────────
// INIT — connect to WiFi (replaces gsmInit's AT handshake + GPRS attach)
// ─────────────────────────────────────────────────────────────────

bool wifiInit() {
  LOGLN("[WIFI] Connecting to WiFi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(300);
    LOG(".");
  }
  LOGLN("");

  if (WiFi.status() != WL_CONNECTED) {
    LOGLN("[WIFI] ERROR: Failed to connect. Check WIFI_SSID/WIFI_PASSWORD in config.h.");
    return false;
  }

  LOGF("[WIFI] ✓ Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  return true;
}

// ─────────────────────────────────────────────────────────────────
// HTTP POST — same JSON schema as gsmPostReading()
// ─────────────────────────────────────────────────────────────────

int wifiPostReading(float fill_pct, float battery_pct, int rssi_dbm) {

  if (WiFi.status() != WL_CONNECTED) {
    LOGLN("[WIFI] ERROR: Not connected, cannot POST.");
    return -1;
  }

  // Build JSON payload — must match SensorPayload schema in backend.
  // Identical structure to gsm_handler.cpp's payload.
  char payload[200];
  snprintf(payload, sizeof(payload),
    "{"
    "\"sensor_id\":\"%s\","
    "\"fill_pct\":%.2f,"
    "\"battery_pct\":%.2f,"
    "\"rssi_dbm\":%d"
    "}",
    NODE_ID, fill_pct, battery_pct, rssi_dbm
  );

  // Build URL. NOTE: API_HOST must be the bare host/IP (e.g. "127.0.0.1"),
  // NOT prefixed with "http://" — that prefix is added here. If API_HOST
  // still has "http://" baked in from the old config, this will produce
  // a broken double-scheme URL, same bug currently present in
  // gsm_handler.cpp.
  char url[150];
  snprintf(url, sizeof(url),
           "http://%s:%d%s", API_HOST, API_PORT, API_PATH);

  LOGLN("[WIFI] ── Transmitting to BinWise backend ──────────");
  LOGF("[WIFI] URL: %s\n", url);
  LOGF("[WIFI] Payload: %s\n", payload);

  int http_code = -1;

  for (int attempt = 1; attempt <= GSM_RETRY_COUNT; attempt++) {
    LOGF("[WIFI] Attempt %d/%d\n", attempt, GSM_RETRY_COUNT);

    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    http_code = http.POST((uint8_t*)payload, strlen(payload));
    http.end();

    if (http_code == 201) {
      LOGF("[WIFI] ✓ Backend response: %d Created\n", http_code);
      LOGLN("[WIFI] ── Transmission complete ───────────────────");
      return http_code;
    } else {
      LOGF("[WIFI] Unexpected response: %d. Retrying...\n", http_code);
      delay(2000);
    }
  }

  LOGLN("[WIFI] ✗ All transmission attempts failed.");
  return http_code;
}

// ─────────────────────────────────────────────────────────────────
// SIGNAL STRENGTH — WiFi.RSSI() is already in dBm, no conversion needed
// ─────────────────────────────────────────────────────────────────

int wifiGetRSSI() {
  if (WiFi.status() != WL_CONNECTED) return -999;
  return WiFi.RSSI();
}

// ─────────────────────────────────────────────────────────────────
// READY CHECK
// ─────────────────────────────────────────────────────────────────

bool wifiIsReady() {
  return WiFi.status() == WL_CONNECTED;
}

// ─────────────────────────────────────────────────────────────────
// POWER DOWN
// ─────────────────────────────────────────────────────────────────

void wifiPowerDown() {
  LOGLN("[WIFI] Disconnecting WiFi...");
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  LOGLN("[WIFI] WiFi powered down.");
}
