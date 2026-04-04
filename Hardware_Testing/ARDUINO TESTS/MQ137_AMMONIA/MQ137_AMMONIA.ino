#include <Wire.h>  // For I2C communication if needed

// -------------------- MQ-135 Pin --------------------
const int mq135Pin = A0;   // Analog pin connected to MQ-135

// -------------------- Calibration --------------------
float Ro = 0.0;            // Sensor resistance in clean air
bool isCalibrated = false;
unsigned long startTime;

// -------------------- Constants --------------------
// MQ-135 curve for NH3 (from datasheet approx values)
const float aNH3 = 102.2;
const float bNH3 = -2.473;

// Number of samples to average for Ro calibration
const int calibrationSamples = 100;

void setup() {
  Serial.begin(9600);
  startTime = millis();
  Serial.println("MQ-135 NH3 Monitoring - Live Readings");
}

void loop() {
  int raw = analogRead(mq135Pin);
  float Vout = (raw / 1023.0) * 5.0;  // Convert to voltage
  float Rs = (5.0 - Vout) / Vout;      // Sensor resistance ratio approximation

  // Gradual Ro calibration during first 2 minutes
  if (!isCalibrated) {
    unsigned long elapsed = millis() - startTime;
    if (elapsed < 120000) {  // 2 minutes calibration window
      Ro += Rs;
      static int count = 0;
      count++;
      if (count >= calibrationSamples) {
        Ro = Ro / calibrationSamples;  // average
        isCalibrated = true;
        Serial.print("Calibration done. Ro = ");
        Serial.println(Ro);
      }
    } 
  }

  // Compute Gas Index / NH3 ppm if Ro calibrated
  float nh3_ppm = 0.0;
  if (isCalibrated) {
    float ratio = Rs / Ro;
    nh3_ppm = aNH3 * pow(ratio, bNH3);
  }

  // Print readings
  Serial.print("RAW: ");
  Serial.print(raw);
  Serial.print(" | Rs: ");
  Serial.print(Rs, 2);
  if (isCalibrated) {
    Serial.print(" | NH3 ppm: ");
    Serial.println(nh3_ppm, 2);
  } else {
    Serial.println(" | Calibrating...");
  }

  delay(1000);  // 1 second between readings
}
