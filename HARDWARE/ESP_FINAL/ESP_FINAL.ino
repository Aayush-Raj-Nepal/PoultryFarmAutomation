#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <ESP8266HTTPClient.h>
#include <SoftwareSerial.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "HX711.h"

// ---------------- WiFi / Server ----------------
const char* ssid      = "AdvancedCollege";
const char* password  = "acem@123";
const char* serverUrl = "https://poultryfarmautomation.onrender.com/ingest";
const char* deviceId  = "farm-node-01";
const int   cycleNo   = 1;

// ---------------- HX711 ----------------
#define HX711_DOUT D7
#define HX711_SCK  D5
HX711 scale;

// ---------------- Nano Serial ----------------
SoftwareSerial nanoSerial(D6, -1);   // RX = D6, TX not used

// ---------------- OLED ----------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---------------- Calibration ----------------
float calibration_factor = -24.873;   // same as your working code

struct SensorData {
  float t, h, l;
  int a, c;
  float w;     // weight in kg
  bool valid;
};

uint32_t sampleIndex = 0;

// ---------------- OLED Helper ----------------
void oledPrint(const String &l1, const String &l2 = "", const String &l3 = "", const String &l4 = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println(l1);
  display.println(l2);
  display.println(l3);
  display.println(l4);
  display.display();
}

// ---------------- CSV Parser ----------------
// Expected format from Nano:
// temperature,humidity,light,ammonia,co2
SensorData parseCsvLine(String line) {
  SensorData data;
  data.valid = false;
  line.trim();

  int commas[4];
  int found = 0;

  for (int i = 0; i < line.length() && found < 4; i++) {
    if (line[i] == ',') {
      commas[found++] = i;
    }
  }

  if (found == 4) {
    data.t = line.substring(0, commas[0]).toFloat();
    data.h = line.substring(commas[0] + 1, commas[1]).toFloat();
    data.l = line.substring(commas[1] + 1, commas[2]).toFloat();
    data.a = line.substring(commas[2] + 1, commas[3]).toInt();
    data.c = line.substring(commas[3] + 1).toInt();
    data.valid = true;
  }

  return data;
}

// ---------------- WiFi Connect ----------------
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  oledPrint("Connecting WiFi...");
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");
  Serial.println(WiFi.localIP());

  oledPrint("WiFi Connected", WiFi.localIP().toString());
}

// ---------------- Setup ----------------
void setup() {
  Serial.begin(115200);
  nanoSerial.begin(9600);

  // OLED init
  Wire.begin(D2, D1);   // SDA = D2, SCL = D1
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found");
  }

  oledPrint("Booting System...");

  // HX711 init
  scale.begin(HX711_DOUT, HX711_SCK);
  Serial.println("Initializing scale...");

  while (!scale.is_ready()) {
    Serial.println("Waiting for HX711...");
    oledPrint("Waiting for HX711...");
    delay(1000);
  }

  scale.set_scale(calibration_factor);
  scale.tare();
  Serial.println("Scale initialized and tared.");

  oledPrint("Scale Ready", "Tare complete");

  // WiFi init
  connectWiFi();

  delay(1500);
}

// ---------------- Loop ----------------
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (nanoSerial.available()) {
    String rawData = nanoSerial.readStringUntil('\n');
    rawData.trim();

    Serial.print("Raw Nano Data: ");
    Serial.println(rawData);

    SensorData data = parseCsvLine(rawData);

    if (data.valid) {
      // Same logic as your working code:
      // get_units(10) gives calibrated reading
      // divide by 1000 to convert to kg
      float weight_kg = scale.get_units(10) / 1000.0;

      // Remove tiny noise
      if (abs(weight_kg) < 0.02) {
        weight_kg = 0.0;
      }

      data.w = weight_kg;

      // Build JSON with weight in KG
      String json = "{";
      json += "\"deviceId\":\"" + String(deviceId) + "\",";
      json += "\"cycle\":" + String(cycleNo) + ",";
      json += "\"samples\":[{";
      json += "\"i\":" + String(sampleIndex) + ",";
      json += "\"t\":" + String(data.t, 1) + ",";
      json += "\"h\":" + String(data.h, 1) + ",";
      json += "\"l\":" + String(data.l, 1) + ",";
      json += "\"a\":" + String(data.a) + ",";
      json += "\"c\":" + String(data.c) + ",";
      json += "\"n\":" + String(data.a * -1) + ",";
      json += "\"w\":" + String(data.w*1000, 3);   // weight in kg
      json += "}]}";

      Serial.println("Sending JSON:");
      Serial.println(json);

      BearSSL::WiFiClientSecure client;
      client.setInsecure();

      HTTPClient https;
      https.setTimeout(10000);

      if (https.begin(client, serverUrl)) {
        https.addHeader("Content-Type", "application/json");

        int httpCode = https.POST(json);
        String response = https.getString();

        Serial.print("HTTP Code: ");
        Serial.println(httpCode);
        Serial.print("Response: ");
        Serial.println(response);

        if (httpCode >= 200 && httpCode < 300) {
          oledPrint(
            "UPLOAD OK",
            "W: " + String(data.w, 2) + " kg",
            "T: " + String(data.t, 1),
            "Idx: " + String(sampleIndex)
          );
          sampleIndex++;
        } else {
          oledPrint(
            "UPLOAD ERROR",
            "Code: " + String(httpCode),
            "W: " + String(data.w, 2) + " kg"
          );
        }

        https.end();
      } else {
        Serial.println("HTTPS begin failed");
        oledPrint("HTTPS Failed");
      }
    } else {
      Serial.println("Invalid CSV data received");
    }
  }
}