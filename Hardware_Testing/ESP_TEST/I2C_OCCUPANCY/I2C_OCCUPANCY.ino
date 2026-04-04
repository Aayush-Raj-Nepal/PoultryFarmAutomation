#include <Wire.h>

// NodeMCU defaults:
// SDA = D2 (GPIO4)
// SCL = D1 (GPIO5)
#define SDA_PIN D2
#define SCL_PIN D1

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println();
  Serial.println("=== ESP8266 I2C Scanner ===");

  Wire.begin(SDA_PIN, SCL_PIN); // set I2C pins
  Wire.setClock(100000);        // 100kHz is safe for most sensors
}

void loop() {
  byte error, address;
  int found = 0;

  Serial.println("Scanning I2C bus...");

  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Found device at 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      found++;
    }
  }

  if (found == 0) {
    Serial.println("No I2C devices found 😬 (check wiring/power)");
  } else {
    Serial.print("Total devices found: ");
    Serial.println(found);
  }

  Serial.println();
  delay(5000);
}
