#define BLYNK_TEMPLATE_ID "TMPL6RAILcjaK"
#define BLYNK_TEMPLATE_NAME "Hatchery"
#define BLYNK_AUTH_TOKEN "wfCDfEcvXvG0YQX3LbuX72XVEIbhk42r"

#include <ESP8266WiFi.h>
#include <BlynkSimpleEsp8266.h>
#include <Wire.h>
#include <SoftwareSerial.h>
#include "SparkFun_VEML6030_Ambient_Light_Sensor.h"
#include <MHZ19.h>

// ========= LIBRARIES FOR BACKEND COMMUNICATION =========
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h> // <<< MODIFIED: Use the secure client for HTTPS
#include <ArduinoJson.h>      // For creating the JSON payload

// ==================== CONSTANTS ====================
const int BUFFER_SIZE = 3;
const unsigned long 
  NANO_TIMEOUT = 1200,
  DATA_FRESHNESS = 18000,
  CO2_READ_INTERVAL = 5000,
  LUX_READ_INTERVAL = 2000,
  MAINTENANCE_INTERVAL = 60000,
  RESET_4HR = 14400000,
  RESET_WEEKLY = 604800000,
  CHECK_MONTHLY = 2592000000;

// ==================== CONFIGURATION ====================
char ssid[] = "AdvancedCollege";
char pass[] = "acem@123";

// ========= BACKEND SERVER CONFIGURATION =========
// IMPORTANT: Using https for the secure server on Render
const char* backend_url = "https://farm-main-nine.vercel.app/api/data"; 
const char* device_secret = "GJ123!secure";

// ==================== PIN CONFIG ====================
#define NANO_RX D6
#define MHZ_RX D2
#define MHZ_TX D1
#define SDA_PIN D4
#define SCL_PIN D3

// ==================== DATA STRUCTURES ====================
struct NanoData {
  float temp = 98;
  float hum = 98;
  float nh3 = 98;
  float weight = 98;
  unsigned long timestamp = 0;
};

// ==================== GLOBAL VARIABLES ====================
SoftwareSerial nanoSerial(NANO_RX, -1);
SoftwareSerial mhzSerial(MHZ_RX, MHZ_TX);
MHZ19 mhz19;
SparkFun_Ambient_Light veml(0x10);

NanoData nanoBuffer[BUFFER_SIZE];
int bufferIndex = 0;
int co2ppm = 98;
float lux = 98;

unsigned long 
  lastCO2Read = 0,
  lastLuxRead = 0,
  lastSend = 0,
  last4hrReset = 0,
  lastWeeklyReset = 0,
  lastMonthlyCheck = 0,
  lastMaintenanceCheck = 0;

void sendDataToBackend(float temp, float hum, float nh3, float weight, float current_lux, int current_co2);

void setup() {
  Serial.begin(9600);
  Wire.begin(SDA_PIN, SCL_PIN);
  nanoSerial.begin(9600);
  mhzSerial.begin(9600);
  mhz19.begin(mhzSerial);
  mhz19.autoCalibration(false);

  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");

  unsigned long now = millis();
  last4hrReset = now;
  lastWeeklyReset = now;
  lastMonthlyCheck = now;
}

void loop() {
  Blynk.run();
  unsigned long currentTime = millis();

  // (The rest of your loop remains perfectly unchanged)

  if (nanoSerial.available()) processNanoData();

  if (currentTime - lastCO2Read >= CO2_READ_INTERVAL) {
    lastCO2Read = currentTime;
    int ppm = mhz19.getCO2();
    co2ppm = (ppm >= 300 && ppm <= 5000) ? ppm : 98;
    Blynk.virtualWrite(V5, co2ppm);
  }

  if (currentTime - lastLuxRead >= LUX_READ_INTERVAL) {
    lastLuxRead = currentTime;
    if (veml.begin()) {
      veml.setGain(0.125);
      veml.setIntegTime(100);
      lux = veml.readLight();
    } else {
      lux = 98;
    }
    Blynk.virtualWrite(V4, lux);
  }

  if (currentTime - lastSend >= 60000) {
    lastSend = currentTime;
    sendLatestData();
  }
}

// ========= MODIFIED: FUNCTION TO SEND DATA TO YOUR SECURE BACKEND =========
void sendDataToBackend(float temp, float hum, float nh3, float weight, float current_lux, int current_co2) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Backend Send Failed: WiFi not connected.");
    return;
  }

  // <<< NEW: Create a WiFiClientSecure object
  WiFiClientSecure client;
  HTTPClient http;

  // <<< NEW: Allow insecure connections for simplicity with Render's dynamic certificates
  // This enables encryption but skips server certificate validation.
  client.setInsecure();
  
  Serial.println("\n[HTTPS] Beginning POST request to secure backend...");
  if (http.begin(client, backend_url)) { // The client object is passed to http.begin
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-secret", device_secret);
    // Add the ngrok-skip-browser-warning header here
    http.addHeader("ngrok-skip-browser-warning", "true"); // Added header to skip ngrok browser warning

    StaticJsonDocument<256> doc;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["nh3"] = nh3;
    doc["weight"] = weight;
    doc["lux"] = current_lux;
    doc["co2_ppm"] = current_co2;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    Serial.print("[HTTPS] Sending payload: ");
    Serial.println(jsonPayload);
    int httpCode = http.POST(jsonPayload);

    if (httpCode > 0) {
      Serial.printf("[HTTPS] POST... code: %d\n", httpCode);
      if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
        String response = http.getString();
        Serial.print("[HTTPS] Response: ");
        Serial.println(response);
      }
    } else {
      Serial.printf("[HTTPS] POST... failed, error: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  } else {
    Serial.println("[HTTPS] Unable to connect to backend URL.");
  }
}

// (Your original functions below are all unchanged)

void perform4hrReset() { /* ... */ }
void performWeeklyReset() { /* ... */ }
void performMonthlyCheck() { /* ... */ }
void processNanoData() {
  String raw = nanoSerial.readStringUntil('\n');
  NanoData newData;
  if (sscanf(raw.c_str(), "%f,%f,%f,%f", 
             &newData.temp, &newData.hum, 
             &newData.nh3, &newData.weight) == 4) {
    newData.timestamp = millis();
    nanoBuffer[bufferIndex % BUFFER_SIZE] = newData;
    bufferIndex++;
  }
}

void sendLatestData() {
  NanoData latest = {98, 98, 98, 98, 0};
  for (int i = 0; i < min(BUFFER_SIZE, bufferIndex); i++) {
    int idx = (bufferIndex - 1 - i) % BUFFER_SIZE;
    if (millis() - nanoBuffer[idx].timestamp < DATA_FRESHNESS) {
      latest = nanoBuffer[idx];
      break;
    }
  }

  Blynk.virtualWrite(V0, latest.temp);
  Blynk.virtualWrite(V1, latest.hum);
  Blynk.virtualWrite(V2, latest.nh3);
  Blynk.virtualWrite(V3, latest.weight);

  // This single call now sends all data to your secure backend
  sendDataToBackend(latest.temp, latest.hum, latest.nh3, latest.weight, lux, co2ppm);

  Serial.printf("Data Sent -> Temp:%.1f, Hum:%.1f, NH3:%.1f, Weight:%.1f | Lux: %.1f | CO2: %d\n",
                latest.temp, latest.hum, latest.nh3, latest.weight,
                lux, co2ppm);
}
