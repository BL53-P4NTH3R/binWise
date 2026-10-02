/**
 * BinWise — gsm_handler.cpp
 * ─────────────────────────────────────────────────────────────────
 * SIM800L GSM/GPRS implementation.
 * Uses hardware UART1 on ESP32-S3 (GPIO17 TX, GPIO18 RX).
 * ─────────────────────────────────────────────────────────────────
 */

#include "gsm_handler.h"

// UART1 stream for SIM800L communication
HardwareSerial SimSerial(1);

// ─────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Send an AT command and wait for an expected response.
 * Returns true if expected string is found in response.
 */
static bool sendAT(const char* command,
                   const char* expected,
                   unsigned long timeout_ms = 3000) {
  // Flush any stale data
  while (SimSerial.available()) SimSerial.read();

  SimSerial.println(command);
  LOGF("[GSM]  >> %s\n", command);

  unsigned long start = millis();
  String response     = "";

  while (millis() - start < timeout_ms) {
    while (SimSerial.available()) {
      char c = SimSerial.read();
      response += c;
    }
    if (response.indexOf(expected) >= 0) {
      LOGF("[GSM]  << %s\n", response.c_str());
      return true;
    }
    delay(10);
  }

  LOGF("[GSM]  TIMEOUT waiting for: %s (got: %s)\n",
       expected, response.c_str());
  return false;
}

/**
 * Send AT command and return the full response string.
 */
static String sendATGetResponse(const char* command,
                                unsigned long timeout_ms = 3000) {
  while (SimSerial.available()) SimSerial.read();

  SimSerial.println(command);
  LOGF("[GSM]  >> %s\n", command);

  unsigned long start = millis();
  String response     = "";

  while (millis() - start < timeout_ms) {
    while (SimSerial.available()) {
      response += (char)SimSerial.read();
    }
    delay(10);
  }

  LOGF("[GSM]  << %s\n", response.c_str());
  return response;
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

bool gsmInit() {
  LOGLN("[GSM]  Initialising SIM800L...");

  // Start UART1: baud, config, RX pin, TX pin
  SimSerial.begin(GSM_BAUD, SERIAL_8N1, PIN_SIM_RX, PIN_SIM_TX);
  delay(3000);  // SIM800L needs ~3s after power-on before AT commands

  // Test basic communication
  bool responsive = false;
  for (int i = 0; i < 5; i++) {
    if (sendAT("AT", "OK", 2000)) {
      responsive = true;
      break;
    }
    delay(1000);
  }

  if (!responsive) {
    LOGLN("[GSM]  ERROR: SIM800L not responding. Check wiring.");
    LOGLN("[GSM]  Verify: GPIO17 TX → SIM RXD, GPIO18 RX ← SIM TXD");
    LOGLN("[GSM]  Verify: SIM800L VCC = battery rail (3.7-4.2V)");
    return false;
  }

  // Disable echo (cleaner responses)
  sendAT("ATE0", "OK");

  // Check SIM card
  if (!sendAT("AT+CPIN?", "READY", 5000)) {
    LOGLN("[GSM]  ERROR: SIM not ready. Check SIM card insertion.");
    return false;
  }
  LOGLN("[GSM]  ✓ SIM card ready");

  // Check signal quality
  String csq = sendATGetResponse("AT+CSQ", 3000);
  LOGF("[GSM]  Signal: %s\n", csq.c_str());

  // Wait for network registration
  bool registered = false;
  for (int i = 0; i < 10; i++) {
    String creg = sendATGetResponse("AT+CREG?", 3000);
    if (creg.indexOf("+CREG: 0,1") >= 0 ||
        creg.indexOf("+CREG: 0,5") >= 0) {
      registered = true;
      break;
    }
    LOGLN("[GSM]  Waiting for network registration...");
    delay(2000);
  }

  if (!registered) {
    LOGLN("[GSM]  WARNING: Network registration timeout.");
    LOGLN("[GSM]  Check SIM card has data plan (MTN Nigeria).");
  }

  // Attach to GPRS
  sendAT("AT+CGATT=1", "OK", 10000);

  // Configure bearer (APN)
  sendAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", "OK");

  char apn_cmd[80];
  snprintf(apn_cmd, sizeof(apn_cmd),
           "AT+SAPBR=3,1,\"APN\",\"%s\"", GSM_APN);
  sendAT(apn_cmd, "OK");

  if (!sendAT("AT+SAPBR=1,1", "OK", 10000)) {
    LOGLN("[GSM]  WARNING: Bearer open may have failed.");
    LOGLN("[GSM]  Check APN: " GSM_APN);
  }

  LOGLN("[GSM]  ✓ GPRS attached. Ready to transmit.");
  return true;
}

// ─────────────────────────────────────────────────────────────────
// HTTP POST
// ─────────────────────────────────────────────────────────────────

int gsmPostReading(float fill_pct, float battery_pct, int rssi_dbm) {

  // Build JSON payload — must match SensorPayload schema in backend
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

  int payload_len = strlen(payload);

  // Build URL
  char url[150];
  snprintf(url, sizeof(url),
           "http://%s:%d%s", API_HOST, API_PORT, API_PATH);

  LOGLN("[GSM]  ── Transmitting to BinWise backend ──────────");
  LOGF("[GSM]  URL: %s\n", url);
  LOGF("[GSM]  Payload: %s\n", payload);

  int http_code = -1;

  for (int attempt = 1; attempt <= GSM_RETRY_COUNT; attempt++) {
    LOGF("[GSM]  Attempt %d/%d\n", attempt, GSM_RETRY_COUNT);

    // Initialise HTTP service
    if (!sendAT("AT+HTTPINIT", "OK", 5000)) {
      delay(2000);
      continue;
    }

    // Set URL
    char url_cmd[180];
    snprintf(url_cmd, sizeof(url_cmd),
             "AT+HTTPPARA=\"URL\",\"%s\"", url);
    if (!sendAT(url_cmd, "OK", 3000)) {
      sendAT("AT+HTTPTERM", "OK");
      delay(2000);
      continue;
    }

    // Set content type to JSON
    if (!sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK")) {
      sendAT("AT+HTTPTERM", "OK");
      delay(2000);
      continue;
    }

    // Send payload size and wait for DOWNLOAD prompt
    char data_cmd[40];
    snprintf(data_cmd, sizeof(data_cmd),
             "AT+HTTPDATA=%d,10000", payload_len);

    if (!sendAT(data_cmd, "DOWNLOAD", 5000)) {
      sendAT("AT+HTTPTERM", "OK");
      delay(2000);
      continue;
    }

    // Send the actual JSON payload
    SimSerial.print(payload);
    delay(1000);

    // Wait for OK after data sent
    bool data_ok = false;
    unsigned long t = millis();
    String resp    = "";
    while (millis() - t < 5000) {
      while (SimSerial.available()) resp += (char)SimSerial.read();
      if (resp.indexOf("OK") >= 0) { data_ok = true; break; }
      delay(50);
    }

    if (!data_ok) {
      LOGLN("[GSM]  ERROR: Data send failed");
      sendAT("AT+HTTPTERM", "OK");
      delay(2000);
      continue;
    }

    // Execute HTTP POST (action=1)
    String action_resp = sendATGetResponse(
      "AT+HTTPACTION=1", GSM_TIMEOUT_MS);

    // Parse HTTP response code from +HTTPACTION: 1,<code>,<len>
    int comma1 = action_resp.indexOf(",");
    int comma2 = action_resp.indexOf(",", comma1 + 1);
    if (comma1 > 0 && comma2 > comma1) {
      String code_str = action_resp.substring(comma1 + 1, comma2);
      http_code = code_str.toInt();
    }

    // Terminate HTTP session
    sendAT("AT+HTTPTERM", "OK");

    if (http_code == 201) {
      LOGF("[GSM]  ✓ Backend response: %d Created\n", http_code);
      LOGLN("[GSM]  ── Transmission complete ───────────────────");
      return http_code;
    } else {
      LOGF("[GSM]  Unexpected response: %d. Retrying...\n", http_code);
      delay(3000);
    }
  }

  LOGLN("[GSM]  ✗ All transmission attempts failed.");
  return -1;
}

// ─────────────────────────────────────────────────────────────────
// SIGNAL STRENGTH
// ─────────────────────────────────────────────────────────────────

int gsmGetRSSI() {
  String resp = sendATGetResponse("AT+CSQ", 3000);

  // Response format: +CSQ: <rssi>,<ber>
  // rssi values: 0=−113dBm ... 31=−51dBm, 99=unknown
  int idx = resp.indexOf("+CSQ: ");
  if (idx < 0) return -999;

  int comma = resp.indexOf(",", idx);
  String rssi_str = resp.substring(idx + 6, comma);
  int rssi_val = rssi_str.toInt();

  if (rssi_val == 99) return -999;

  // Convert CSQ value to dBm: dBm = -113 + (rssi * 2)
  return -113 + (rssi_val * 2);
}

// ─────────────────────────────────────────────────────────────────
// READY CHECK
// ─────────────────────────────────────────────────────────────────

bool gsmIsReady() {
  return sendAT("AT", "OK", 2000) &&
         sendAT("AT+CPIN?", "READY", 3000);
}

// ─────────────────────────────────────────────────────────────────
// POWER DOWN
// ─────────────────────────────────────────────────────────────────

void gsmPowerDown() {
  LOGLN("[GSM]  Powering down SIM800L...");
  // Close bearer first
  sendAT("AT+SAPBR=0,1", "OK", 5000);
  // Normal power down
  sendAT("AT+CPOWD=1", "NORMAL POWER DOWN", 5000);
  SimSerial.end();
  LOGLN("[GSM]  SIM800L powered down.");
}
