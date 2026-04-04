#include <SoftwareSerial.h>

// SIM900 wiring:
// SIM900 TXD -> UNO D7
// SIM900 RXD <- UNO D8 (use divider/level shift!)
SoftwareSerial gsm(7, 8); // (RX, TX)



String phoneNumber = "+9779742426324"; // <-- put your number here (Nepal example)
String apn = "web";               // <-- set if you want GPRS test (e.g., "ntc.net.np" / "ncell")

// ---------- helpers ----------
void flushGSM() {
  while (gsm.available()) gsm.read();
}

String readGSM(unsigned long timeout = 2000) {
  String s = "";
  unsigned long start = millis();
  while (millis() - start < timeout) {
    while (gsm.available()) {
      char c = gsm.read();
      s += c;
    }
  }
  return s;
}

bool sendAT(const String &cmd, const char *expect = "OK", unsigned long timeout = 2000) {
  flushGSM();
  gsm.println(cmd);
  String r = readGSM(timeout);
  Serial.print(">> "); Serial.println(cmd);
  Serial.print("<< "); Serial.println(r);
  if (expect == nullptr) return true;
  return r.indexOf(expect) != -1;
}



// ---------- tests ----------
void basicInfo() {
  sendAT("AT");
  sendAT("ATE0");                 // echo off
  sendAT("ATI");                  // module info
  sendAT("AT+GMR");               // firmware
  sendAT("AT+CSQ");               // signal
  sendAT("AT+CCID");              // SIM ICCID
  sendAT("AT+CPIN?");             // SIM ready?
  sendAT("AT+CREG?");             // network registration
  sendAT("AT+COPS?");             // operator
}

void smsSetup() {
  sendAT("AT+CMGF=1");            // SMS text mode
  sendAT("AT+CSCS=\"GSM\"");      // charset
  sendAT("AT+CNMI=2,1,0,0,0");    // new SMS indications
}

void sendSMS(const String &num, const String &msg) {
  smsSetup();
  flushGSM();
  Serial.println("Sending SMS...");
  gsm.print("AT+CMGS=\"");
  gsm.print(num);
  gsm.println("\"");
  delay(200);
  gsm.print(msg);
  gsm.write(26); // Ctrl+Z
  String r = readGSM(10000);
  Serial.println(r);
}

void readAllSMS() {
  smsSetup();
  sendAT("AT+CMGL=\"ALL\"", "OK", 8000);
}

void deleteAllSMS() {
  smsSetup();
  // Many SIM900 support CMGD=1,4 to delete all
  sendAT("AT+CMGD=1,4", "OK", 5000);
}

void makeCall(const String &num) {
  Serial.println("Dialing...");
  sendAT("ATD" + num + ";", "OK", 3000);
  Serial.println("Type 'h' to hang up.");
}

void hangUp() {
  sendAT("ATH", "OK", 3000);
}

void gprsBasicTest() {
  // This is a *basic* attach + bearer setup check. Actual HTTP needs more steps.
  sendAT("AT+CGATT?", "OK", 3000);              // attached?
  sendAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"");
  sendAT("AT+SAPBR=3,1,\"APN\",\"" + apn + "\"");
  sendAT("AT+SAPBR=1,1", "OK", 15000);          // open bearer
  sendAT("AT+SAPBR=2,1", "OK", 5000);           // query IP
  sendAT("AT+SAPBR=0,1", "OK", 10000);          // close bearer
}

String renderHost = "sim900-proxy.itsmeaayush24.workers.dev";

// POST a simple text payload using SIM900 HTTP AT commands (SAPBR + HTTP)
void httpPostToRender(const String &payload) {
  Serial.println("\n=== HTTP POST to Render ===");

  // 1) Ensure attached
  sendAT("AT+CGATT?", "OK", 3000);

  // 2) Open bearer
  sendAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"");
  sendAT("AT+SAPBR=3,1,\"APN\",\"" + apn + "\"");
  // If your SIM requires user/pass, add:
  // sendAT("AT+SAPBR=3,1,\"USER\",\"\"");
  // sendAT("AT+SAPBR=3,1,\"PWD\",\"\"");

  if (!sendAT("AT+SAPBR=1,1", "OK", 20000)) {
    Serial.println("Bearer open failed.");
    return;
  }
  sendAT("AT+SAPBR=2,1", "OK", 5000);

  // 3) Init HTTP
  sendAT("AT+HTTPTERM", nullptr, 1000); // ignore errors if not started

  if (!sendAT("AT+HTTPINIT", "OK", 5000)) {
    Serial.println("HTTPINIT failed.");
    sendAT("AT+SAPBR=0,1", "OK", 10000);
    return;
  }

  sendAT("AT+HTTPPARA=\"CID\",1");

  // IMPORTANT: start with http (not https)
  String url = "http://" + renderHost;
  sendAT("AT+HTTPPARA=\"URL\",\"" + url + "\"");

  // Content type
  sendAT("AT+HTTPPARA=\"CONTENT\",\"text/plain\"");

  // 4) Provide body
  sendAT("AT+HTTPDATA=" + String(payload.length()) + ",10000", "DOWNLOAD", 8000);
  gsm.print(payload);
  delay(200);

  // 5) POST
  sendAT("AT+HTTPACTION=1", "OK", 3000);

  // Wait for final result line: +HTTPACTION: 1,<status>,<len>
  String r = readGSM(25000);
  Serial.println("HTTPACTION result:");
  Serial.println(r);

  // Try to read response
  sendAT("AT+HTTPREAD", "OK", 10000);

  // 6) Cleanup
  sendAT("AT+HTTPTERM", "OK", 5000);
  sendAT("AT+SAPBR=0,1", "OK", 10000);

  Serial.println("=== Done ===\n");
}


void printMenu() {
  Serial.println();
  Serial.println("=== SIM900 TEST MENU ===");
  Serial.println("1: Basic info (AT, signal, SIM, network)");
  Serial.println("2: Send test SMS to phoneNumber");
  Serial.println("3: Read ALL SMS");
  Serial.println("4: Delete ALL SMS");
  Serial.println("5: Make a call to phoneNumber");
  Serial.println("h: Hang up call");
  Serial.println("6: GPRS basic attach/bearer test (needs APN)");
  Serial.println("7: HTTP POST test to Render /ingest");
  Serial.println("m: Show menu");
  Serial.println("========================");
}

// ---------- setup/loop ----------
void setup() {
  Serial.begin(115200);
  gsm.begin(9600);

  // If your module requires a PWRKEY press to boot, uncomment this:

  Serial.println("SIM900 tester started.");
  printMenu();
}

void loop() {
  // Pass-through for debugging: what you type goes to SIM900
  // and SIM900 replies show on Serial.
  if (Serial.available()) {
    char c = Serial.read();

    // Menu commands
    if (c == '1') basicInfo();
    else if (c == '2') sendSMS(phoneNumber, "SIM900 test SMS from Arduino UNO ✅");
    else if (c == '3') readAllSMS();
    else if (c == '4') deleteAllSMS();
    else if (c == '5') makeCall(phoneNumber);
    else if (c == '6') gprsBasicTest();
    else if (c == '7') httpPostToRender("Hello Render from SIM900 via GPRS ✅\n");
    else if (c == 'h') hangUp();
    else if (c == 'm') printMenu();
    else {
      // raw pass-through
      gsm.write(c);
    }
  }

  if (gsm.available()) {
    Serial.write(gsm.read());
  }
}
