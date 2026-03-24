import { pool } from "./db.js";

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

async function seed() {
  const now = new Date();
  const deviceId = "poultry-node-01";

  await pool.query("DELETE FROM readings");

  let baseWeight = 50;

  for (let i = 0; i < 1200; i++) {
    const ts = new Date(now.getTime() - (1200 - i) * 15 * 60 * 1000);
    const hour = ts.getHours();
    const isDay = hour >= 6 && hour <= 18;

    let temp = isDay ? rand(27, 31) : rand(24, 27);
    let humidity = isDay ? rand(55, 68) : rand(62, 76);
    let light = isDay ? rand(120, 300) : rand(0, 8);
    let co2 = isDay ? rand(700, 1300) : rand(900, 1600);
    let nh3 = rand(2, 8) + (hour % 8 === 0 ? rand(15, 30) : 0);
    let mq = rand(250, 420);

    baseWeight -= rand(0.005, 0.03);
    let weight = baseWeight;

    if (i % 300 === 0 && i !== 0) {
      baseWeight += 10;
      weight = baseWeight;
    }

    if (i === 180 || i === 181 || i === 182) co2 = rand(2400, 3200);
    if (i === 430) temp = rand(35, 38);
    if (i === 620 || i === 621) light = 0;
    if (i === 850 || i === 851) humidity = rand(82, 90);
    if (i === 990) weight -= 7;

    await pool.query(
      `
      INSERT INTO readings (
        device_uid,
        recorded_at,
        cycle_no,
        sample_index,
        temperature_c,
        humidity_pct,
        mq_air_raw,
        light_lux,
        co2_ppm,
        weight_kg,
        nh3_ppm
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [
        deviceId,
        ts,
        Math.floor(i / 3),
        i % 3,
        temp.toFixed(2),
        humidity.toFixed(2),
        Math.round(mq),
        Number(light.toFixed(2)),
        Math.round(co2),
        Number(weight.toFixed(2)),
        Number(nh3.toFixed(2)),
      ],
    );
  }

  console.log("Seed completed");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
