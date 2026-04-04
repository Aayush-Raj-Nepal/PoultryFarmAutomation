#include "HX711.h"

#define DT  2
#define SCK 3

HX711 scale;

void setup() {
  Serial.begin(9600);
  scale.begin(DT, SCK);

  scale.set_scale();   // Calibration comes later
  scale.tare();        // Zero the scale

  Serial.println("HX711 Ready");
}

void loop() {
  Serial.print("Weight: ");
  Serial.println(scale.get_units(10)); // average of 10 readings
  delay(500);
}
