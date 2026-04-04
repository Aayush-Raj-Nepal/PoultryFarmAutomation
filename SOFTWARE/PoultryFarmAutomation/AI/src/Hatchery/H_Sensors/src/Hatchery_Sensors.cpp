#define SERVER_ADDRESS "https://farm-main-nine.vercel.app"

// Include libraries
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_ADXL345_U.h>
#include <Adafruit_Sensor.h>
#include <math.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <ESP8266HTTPClient.h>
#include <SensirionI2cSht4x.h>
#include <ArduinoJson.h>

// WiFi Credentials
char ssid[] = "Setter Wifi";
char pass[] = "setter@123";

// Hardware Settings
#define MUX_ADDRESS 0x70
const int TROLLEY_CHANNELS[6] = {0, 1, 2, 3, 4, 5};

// Sensor instances
Adafruit_MPU6050 mpu;
Adafruit_ADXL345_Unified adxl = Adafruit_ADXL345_Unified(123);
SensirionI2cSht4x sht45;

// Select MUX channel
void selectMUXChannel(uint8_t channel) {
  Wire.beginTransmission(MUX_ADDRESS);
  Wire.write(1 << channel);
  Wire.endTransmission();
  delay(300);
}

// Get tilt angle based on channel
float getTiltAngle(uint8_t channel) {
  selectMUXChannel(channel);
  delay(200);

  float x, y, z;
  if (channel == 4) {  // ADXL on channel 4
    if (!adxl.begin()) return NAN;
    sensors_event_t event;
    adxl.getEvent(&event);
    x = event.acceleration.x;
    y = event.acceleration.y;
    z = event.acceleration.z;
  } else {  // MPU6050
    if (!mpu.begin(0x68)) return NAN;
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    x = a.acceleration.x;
    y = a.acceleration.y;
    z = a.acceleration.z;
  }

  float tilt = atan2(sqrt(x * x + y * y), abs(z)) * 180.0 / PI;
  return (abs(x) > abs(y)) ? (x > 0 ? tilt : -tilt) : (y > 0 ? tilt : -tilt);
}

// Send sensor data to server
void sendSensorData(float temperature, float humidity, float trolleyTilts[6]) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    HTTPClient http;

    client.setInsecure(); // Use certificate validation in production
    http.begin(client, SERVER_ADDRESS "/api/hatchery");
    http.addHeader("Content-Type", "application/json");

    DynamicJsonDocument doc(512);
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    for (int i = 0; i < 6; i++) {
      doc["trolleys"][i] = trolleyTilts[i];
    }
    doc["timestamp"] = millis();

    String payload;
    serializeJson(doc, payload);

    Serial.print("Sending data: ");
    Serial.println(payload);

    int httpCode = http.POST(payload);
    if (httpCode > 0) {
      Serial.printf("[HTTPS] POST... code: %d\n", httpCode);
      if (httpCode == HTTP_CODE_OK) {
        String response = http.getString();
        Serial.println(response);
      }
    } else {
      Serial.printf("[HTTPS] POST... failed, error: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}

// Read sensors (MPU/ADXL + SHT45 on MUX 7)
void readSensors() {
  float temperature = 0, humidity = 0;
  float trolleyTilts[6];

  // Read tilt from each trolley
  for (uint8_t ch = 0; ch < 6; ch++) {
    trolleyTilts[ch] = getTiltAngle(ch);
    if (!isnan(trolleyTilts[ch])) {
      Serial.printf("Trolley %d: %+.1f°\n", ch, trolleyTilts[ch]);
    } else {
      trolleyTilts[ch] = 0;
      Serial.printf("Trolley %d: Sensor Error\n", ch);
    }
  }

  // Select MUX channel 7 for SHT45
  selectMUXChannel(7);
  delay(50);

  sht45.begin(Wire, 0x44);  // ✅ Just call it without 'if'

  // Try measuring from SHT45
  uint16_t err = sht45.measureHighPrecision(temperature, humidity);
  if (err == 0) {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print(" °C | Humidity: ");
    Serial.print(humidity);
    Serial.println(" %RH");
  } else {
    Serial.print("SHT45 Read Error! Code: 0x");
    Serial.println(err, HEX);
    temperature = 0;
    humidity = 0;
  }

  sendSensorData(temperature, humidity, trolleyTilts);
  Serial.println("----------------");
}


// Setup function
void setup() {
  Serial.begin(9600);
  Wire.begin(D2, D1); // SDA, SCL

  // WiFi Connection
  WiFi.begin(ssid, pass);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.println("System initialized");
}

// Loop
void loop() {
  readSensors();
  delay(2000); // 2-second interval
}
