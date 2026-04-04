#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <ESP8266HTTPClient.h>
#include <SoftwareSerial.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================
// WiFi / Server
// =========================
const char* ssid       = "AdvancedCollege";
const char* password   = "acem@123";
const char* serverUrl  = "https://poultryfarmautomation.onrender.com/ingest";

const char* deviceId   = "farm-node-01";
const int   cycleNo    = 1;

// =========================
// OLED Configuration
// =========================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// =========================
// Nano -> ESP Serial
// =========================
SoftwareSerial nanoSerial(D6, -1);   // RX on D6 (GPIO12)

// =========================
// State
// =========================
unsigned long lastWiFiCheck = 0;
uint32_t sampleIndex = 0;

struct SensorData {
  float t; // Temperature
  float h; // Humidity
  float l; // Light
  int a;   // Raw MQ value
  int c;   // CO2 PPM
  int w;   // Weight
  bool valid;
};

void oledPrint(const String &line1, const String &line2 = "", const String &line3 = "", const String &line4 = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println(line1);
  if (line2.length()) display.println(line2);
  if (line3.length()) display.println(line3);
  if (line4.length()) display.println(line4);
  display.display();
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  int dots = 0;
  while (WiFi.status() != WL_CONNECTED && dots < 40) {
    delay(500);
    Serial.print(".");
    dots++;
    oledPrint("Connecting WiFi...", ssid, String("Try: ") + dots);
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected: " + WiFi.localIP().toString());
    oledPrint("WiFi Connected", WiFi.localIP().toString());
  } else {
    oledPrint("WiFi FAILED");
  }
}

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  unsigned long now = millis();
  if (now - lastWiFiCheck > 5000) {
    lastWiFiCheck = now;
    WiFi.disconnect();
    WiFi.begin(ssid, password);
  }
  return false;
}

SensorData parseCsvLine(const String &line) {
  SensorData data;
  data.valid = false;
  data.w = 0; 

  String s = line;
  s.trim();
  if (s.length() == 0) return data;

  // Split logic for 5 fields: T, H, L, MQ_RAW, CO2_PPM
  int commas[4];
  int found = 0;
  for (int i = 0; i < s.length() && found < 4; i++) {
    if (s[i] == ',') commas[found++] = i;
  }

  if (found != 4) return data;

  data.t = s.substring(0, commas[0]).toFloat();
  data.h = s.substring(commas[0] + 1, commas[1]).toFloat();
  data.l = s.substring(commas[1] + 1, commas[2]).toFloat();
  data.a = s.substring(commas[2] + 1, commas[3]).toInt();
  data.c = s.substring(commas[3] + 1).toInt();
  data.valid = true;
  return data;
}

String buildJsonPayload(const SensorData &d) {
  // MAP DATA ACCORDING TO BACKEND EXPECTATIONS:
  // Backend expects Ammonia in 'n' or 'nh3_ppm' or 'a'
  // Backend scales Ammonia by Math.abs(val)/100.
  // We send a negative version of 'a' to 'n' to ensure it processes as a valid reading.
  
  String json = "{";
  json += "\"deviceId\":\"" + String(deviceId) + "\",";
  json += "\"cycle\":" + String(cycleNo) + ",";
  json += "\"samples\":[{";
  json += "\"i\":" + String(sampleIndex) + ",";
  json += "\"t\":" + String(d.t, 1) + ",";
  json += "\"h\":" + String(d.h, 1) + ",";
  json += "\"l\":" + String(d.l, 1) + ",";
  json += "\"a\":" + String(d.a) + ",";       // Sent for mq_air_raw column
  json += "\"c\":" + String(d.c) + ",";       // Sent for co2_ppm column
  json += "\"n\":" + String(d.a * -1) + ",";  // Mapped to scaled ammonia (e.g. -400 becomes 4.00)
  json += "\"w\":" + String(d.w);             // Weight
  json += "}]";
  json += "}";
  return json;
}

bool uploadToServer(const String &payload, String &responseOut) {
  if (!ensureWiFi()) return false;

  BearSSL::WiFiClientSecure client;
  client.setInsecure(); 

  HTTPClient https;
  if (https.begin(client, serverUrl)) {
    https.addHeader("Content-Type", "application/json");
    https.setTimeout(12000);
    
    int httpCode = https.POST(payload);
    if (httpCode > 0) {
      responseOut = https.getString();
      https.end();
      return (httpCode >= 200 && httpCode < 300);
    }
    responseOut = https.errorToString(httpCode);
    https.end();
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  nanoSerial.begin(9600);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    for (;;) delay(100);
  }
  display.clearDisplay();
  connectWiFi();
}

void loop() {
  ensureWiFi();

  if (nanoSerial.available()) {
    String rawData = nanoSerial.readStringUntil('\n');
    rawData.trim();
    if (rawData.length() == 0) return;

    SensorData data = parseCsvLine(rawData);
    if (!data.valid) {
      oledPrint("Parse Error", rawData);
      return;
    }

    String payload = buildJsonPayload(data);
    String serverResp;
    
    bool ok = uploadToServer(payload, serverResp);

    if (ok) {
      oledPrint("Upload Success", "T:" + String(data.t,1) + " NH3:" + String(data.a/100.0), "CO2:" + String(data.c), "Idx:" + String(sampleIndex));
      sampleIndex++;
    } else {
      oledPrint("Upload Failed", serverResp.substring(0,20));
    }
  }
}