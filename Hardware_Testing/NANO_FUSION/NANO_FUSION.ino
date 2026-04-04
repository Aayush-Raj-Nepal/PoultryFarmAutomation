
#include <Wire.h>
#include "DFRobot_AHT20.h"

#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2561_U.h>

#include <MHZ19.h>
#include <SoftwareSerial.h>

#include "HX711.h"

// -------------------- Pin Map --------------------
#define MQ135_PIN A0
#define MHZ_RX_PIN 6   // Arduino receives from MH-Z19 TX
#define MHZ_TX_PIN 9   // Arduino sends to MH-Z19 RX

#define HX_DT  2
#define HX_SCK 3

// -------------------- AHT20 --------------------
DFRobot_AHT20 aht20;

// -------------------- TSL2561 --------------------
Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);

// -------------------- MH-Z19 --------------------
SoftwareSerial mhzSerial(MHZ_RX_PIN, MHZ_TX_PIN);
MHZ19 mhz19;

// -------------------- HX711 --------------------
HX711 scale;

// -------------------- MQ-135 Calibration --------------------
// Your curve constants (approx; depends on calibration)
const float aNH3 = 102.2;
const float bNH3 = -2.473;

float mqRo = 0.0;
bool mqCalibrated = false;
unsigned long mqCalStartMs = 0;
int mqCalCount = 0;
const int mqCalibrationSamples = 100;

// -------------------- Timing --------------------
const unsigned long PERIOD_AHT_MS   = 2000;
const unsigned long PERIOD_TSL_MS   = 1000;
const unsigned long PERIOD_MHZ_MS   = 1000;
const unsigned long PERIOD_MQ_MS    = 1000;
const unsigned long PERIOD_HX_MS    = 1000;
const unsigned long PERIOD_FUSE_MS  = 1000;

unsigned long tAHT = 0, tTSL = 0, tMHZ = 0, tMQ = 0, tHX = 0, tFUSE = 0;

// -------------------- Latest sensor values --------------------
bool ahtOk = false, tslOk = false, mhzOk = false, hxOk = false;
float tempC = NAN, humRH = NAN;
float lux = NAN;
int co2ppm = -1, mhzTempC = -999;

int mqRaw = -1;
float mqRs = NAN;
float nh3ppm_est = NAN;

float weightUnits = NAN; // requires calibration factor to be meaningful

// -------------------- Simple Fusion (smoothing) --------------------
float emaTemp = NAN, emaHum = NAN, emaLux = NAN;
float emaCO2  = NAN, emaNH3 = NAN, emaW = NAN;

const float ALPHA = 0.25; // smoothing factor (0..1)

float emaUpdate(float prev, float val) {
  if (isnan(val)) return prev;
  if (isnan(prev)) return val;
  return (ALPHA * val) + ((1.0 - ALPHA) * prev);
}

// -------------------- Helpers --------------------
float computeDewPointC(float tC, float rh) {
  // Magnus approximation; good for typical ambient ranges
  if (isnan(tC) || isnan(rh) || rh <= 0) return NAN;
  const float a = 17.62;
  const float b = 243.12;
  float gamma = (a * tC / (b + tC)) + log(rh / 100.0);
  return (b * gamma) / (a - gamma);
}

void setupAHT20() {
  uint8_t status;
  status = aht20.begin();
  if (status == 0) {
    ahtOk = true;
  } else {
    ahtOk = false;
    Serial.print("{\"err\":\"AHT20 init failed\",\"code\":");
    Serial.print(status);
    Serial.println("}");
  }
}

void setupTSL2561() {
  if (tsl.begin()) {
    tslOk = true;
    tsl.enableAutoRange(true);
    tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_402MS);
  } else {
    tslOk = false;
    Serial.println("{\"err\":\"TSL2561 not detected\"}");
  }
}

void setupMHZ19() {
  mhzSerial.begin(9600);
  mhz19.begin(mhzSerial);
  mhz19.autoCalibration(false);
  mhzOk = true; // we’ll validate by reading >0
}

void setupHX711() {
  scale.begin(HX_DT, HX_SCK);

  // IMPORTANT:
  // You must set a calibration factor for real units (grams/kg).
  // For now we tare and read "units" relative.
  scale.set_scale(); // <-- replace with scale.set_scale(CAL_FACTOR);
  scale.tare();
  hxOk = true;
}

void setupMQ135() {
  mqCalStartMs = millis();
  mqRo = 0.0;
  mqCalCount = 0;
  mqCalibrated = false;
}

void setup() {
  Serial.begin(9600);
  while (!Serial) {}

  Serial.println("{\"boot\":\"sensor_fusion_unit\",\"board\":\"uno\"}");

  Wire.begin();

  setupAHT20();
  setupTSL2561();
  setupMHZ19();
  // setupHX711();
  setupMQ135();

  unsigned long now = millis();
  tAHT = tTSL = tMHZ = tMQ = tHX = tFUSE = now;
}

void loop() {
  unsigned long now = millis();

  // -------- AHT20 --------
  if (now - tAHT >= PERIOD_AHT_MS) {
    tAHT = now;
    if (ahtOk) {
      if (aht20.startMeasurementReady(true)) {
        tempC = aht20.getTemperature_C();
        humRH = aht20.getHumidity_RH();
      } else {
        // keep last values; mark as not-updated
      }
    }
  }

  // -------- TSL2561 --------
  if (now - tTSL >= PERIOD_TSL_MS) {
    tTSL = now;
    if (tslOk) {
      sensors_event_t event;
      tsl.getEvent(&event);
      if (event.light) lux = event.light;
      else lux = 0.0; // very dark
    }
  }

  // -------- MH-Z19 --------
  if (now - tMHZ >= PERIOD_MHZ_MS) {
    tMHZ = now;
    int c = mhz19.getCO2();
    int t = mhz19.getTemperature();
    if (c > 0) {
      co2ppm = c;
      mhzTempC = t;
      mhzOk = true;
    } else {
      mhzOk = false;
    }
  }

  // -------- MQ-135 --------
  if (now - tMQ >= PERIOD_MQ_MS) {
    tMQ = now;

    mqRaw = analogRead(MQ135_PIN);
    float vOut = (mqRaw / 1023.0) * 5.0;
    if (vOut <= 0.001) vOut = 0.001; // prevent divide by zero
    mqRs = (5.0 - vOut) / vOut;

    // Gradual calibration window (up to ~2 minutes; sample count-limited)
    if (!mqCalibrated) {
      if (now - mqCalStartMs < 120000UL) {
        mqRo += mqRs;
        mqCalCount++;
        if (mqCalCount >= mqCalibrationSamples) {
          mqRo = mqRo / mqCalibrationSamples;
          mqCalibrated = true;
        }
      } else {
        // if time passed but not enough samples, finalize anyway
        if (mqCalCount > 0) {
          mqRo = mqRo / mqCalCount;
          mqCalibrated = true;
        }
      }
    }

    if (mqCalibrated && mqRo > 0.0001) {
      float ratio = mqRs / mqRo;
      nh3ppm_est = aNH3 * pow(ratio, bNH3);
      if (nh3ppm_est < 0) nh3ppm_est = 0;
    } else {
      nh3ppm_est = NAN;
    }
  }

  // -------- HX711 --------
  if (now - tHX >= PERIOD_HX_MS) {
    tHX = now;
    if (hxOk) {
      // average of 10 readings (can block a bit but still ok at 1Hz)
      weightUnits = scale.get_units(10);
    }
  }

  // -------- Fusion Frame Output --------
  if (now - tFUSE >= PERIOD_FUSE_MS) {
    tFUSE = now;

    // update EMAs
    emaTemp = emaUpdate(emaTemp, tempC);
    emaHum  = emaUpdate(emaHum, humRH);
    emaLux  = emaUpdate(emaLux, lux);
    if (co2ppm > 0) emaCO2 = emaUpdate(emaCO2, (float)co2ppm);
    emaNH3  = emaUpdate(emaNH3, nh3ppm_est);
    emaW    = emaUpdate(emaW, weightUnits);

    float dewC = computeDewPointC(emaTemp, emaHum);

    // JSON line
    Serial.print("{\"ms\":");
    Serial.print(now);

    // AHT20
    Serial.print(",\"tempC\":");
    if (isnan(emaTemp)) Serial.print("null"); else Serial.print(emaTemp, 2);
    Serial.print(",\"humRH\":");
    if (isnan(emaHum)) Serial.print("null"); else Serial.print(emaHum, 2);
    Serial.print(",\"dewC\":");
    if (isnan(dewC)) Serial.print("null"); else Serial.print(dewC, 2);

    // Lux
    Serial.print(",\"lux\":");
    if (isnan(emaLux)) Serial.print("null"); else Serial.print(emaLux, 2);

    // CO2
    Serial.print(",\"co2ppm\":");
    if (!mhzOk || isnan(emaCO2)) Serial.print("null"); else Serial.print((int)(emaCO2 + 0.5));
    Serial.print(",\"mhzTempC\":");
    if (!mhzOk) Serial.print("null"); else Serial.print(mhzTempC);

    // MQ-135 / NH3 estimate
    Serial.print(",\"mqRaw\":");
    Serial.print(mqRaw);
    Serial.print(",\"mqRs\":");
    if (isnan(mqRs)) Serial.print("null"); else Serial.print(mqRs, 2);
    Serial.print(",\"mqRo\":");
    if (!mqCalibrated) Serial.print("null"); else Serial.print(mqRo, 2);
    Serial.print(",\"nh3_ppm_est\":");
    if (!mqCalibrated || isnan(emaNH3)) Serial.print("null"); else Serial.print(emaNH3, 2);

    // Weight
    Serial.print(",\"weightUnits\":");
    if (isnan(emaW)) Serial.print("null"); else Serial.print(emaW, 2);

    // Status flags
    Serial.print(",\"ok\":{");
    Serial.print("\"aht\":"); Serial.print(ahtOk ? "true" : "false");
    Serial.print(",\"tsl\":"); Serial.print(tslOk ? "true" : "false");
    Serial.print(",\"mhz\":"); Serial.print(mhzOk ? "true" : "false");
    Serial.print(",\"mqCal\":"); Serial.print(mqCalibrated ? "true" : "false");
    Serial.print(",\"hx\":"); Serial.print(hxOk ? "true" : "false");
    Serial.print("}");

    Serial.println("}");
  }
}
