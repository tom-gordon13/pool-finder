import { prisma } from './client';

async function main() {
  // Upsert Boulder locality
  await prisma.locality.upsert({
    where: { id: 'boulder' },
    update: {},
    create: {
      id: 'boulder',
      name: 'Boulder, CO',
      base_url: 'https://bouldercolorado.gov/services/aquatics',
      center_lat: 40.015,
      center_lng: -105.2705,
    },
  });

  console.log('Upserted locality: boulder');

  // Pool seed data
  const pools = [
    {
      id: 'scott-carpenter',
      name: 'Scott Carpenter Pool',
      address: '1505 30th St, Boulder, CO 80303',
      latitude: 40.0074,
      longitude: -105.2519,
      phone_number: '(303) 441-3427',
      website: 'https://bouldercolorado.gov/locations/scott-carpenter-pool',
      schedule_url: 'https://bouldercolorado.gov/scott-carpenter-pool-schedule',
      lane_count: 6,
      hours: [
        { day_of_week: 'Monday',    open_time: '5:30 AM', close_time: '8:00 PM' },
        { day_of_week: 'Tuesday',   open_time: '5:30 AM', close_time: '8:00 PM' },
        { day_of_week: 'Wednesday', open_time: '5:30 AM', close_time: '8:00 PM' },
        { day_of_week: 'Thursday',  open_time: '5:30 AM', close_time: '8:00 PM' },
        { day_of_week: 'Friday',    open_time: '5:30 AM', close_time: '8:00 PM' },
        { day_of_week: 'Saturday',  open_time: '7:00 AM', close_time: '5:00 PM' },
        { day_of_week: 'Sunday',    open_time: '9:00 AM', close_time: '4:00 PM' },
      ],
    },
    {
      id: 'east-boulder',
      name: 'East Boulder Community Center',
      address: '5660 Sioux Dr, Boulder, CO 80303',
      latitude: 40.0196,
      longitude: -105.2185,
      phone_number: '(303) 441-4400',
      website: 'https://bouldercolorado.gov/locations/east-boulder-community-center',
      schedule_url: 'https://bouldercolorado.gov/east-boulder-community-center-pool-schedule',
      lane_count: 8,
      hours: [
        { day_of_week: 'Monday',    open_time: '5:45 AM', close_time: '9:30 PM' },
        { day_of_week: 'Tuesday',   open_time: '5:45 AM', close_time: '9:30 PM' },
        { day_of_week: 'Wednesday', open_time: '5:45 AM', close_time: '9:30 PM' },
        { day_of_week: 'Thursday',  open_time: '5:45 AM', close_time: '9:30 PM' },
        { day_of_week: 'Friday',    open_time: '5:45 AM', close_time: '9:30 PM' },
        { day_of_week: 'Saturday',  open_time: '7:45 AM', close_time: '4:00 PM' },
        { day_of_week: 'Sunday',    open_time: '7:45 AM', close_time: '4:00 PM' },
      ],
    },
    {
      id: 'north-boulder',
      name: 'North Boulder Recreation Center',
      address: '3170 Broadway, Boulder, CO 80304',
      latitude: 40.0469,
      longitude: -105.2794,
      phone_number: '(303) 413-7260',
      website: 'https://bouldercolorado.gov/locations/north-boulder-recreation-center',
      schedule_url: 'https://bouldercolorado.gov/north-boulder-recreation-pool-schedules',
      lane_count: 6,
      hours: [
        { day_of_week: 'Monday',    open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Tuesday',   open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Wednesday', open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Thursday',  open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Friday',    open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Saturday',  open_time: '6:45 AM', close_time: '6:00 PM' },
        { day_of_week: 'Sunday',    open_time: '6:45 AM', close_time: '6:00 PM' },
      ],
    },
    {
      id: 'south-boulder',
      name: 'South Boulder Recreation Center',
      address: '1360 Gillaspie Dr, Boulder, CO 80305',
      latitude: 39.9851,
      longitude: -105.2628,
      phone_number: '(303) 441-3448',
      website: 'https://bouldercolorado.gov/locations/south-boulder-recreation-center',
      schedule_url: 'https://bouldercolorado.gov/south-boulder-recreation-center-pool-schedule',
      lane_count: 8,
      hours: [
        { day_of_week: 'Monday',    open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Tuesday',   open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Wednesday', open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Thursday',  open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Friday',    open_time: '5:45 AM', close_time: '9:00 PM' },
        { day_of_week: 'Saturday',  open_time: '8:45 AM', close_time: '4:00 PM' },
        { day_of_week: 'Sunday',    open_time: '8:45 AM', close_time: '4:00 PM' },
      ],
    },
    {
      id: 'spruce-pool',
      name: 'Spruce Pool',
      address: '2102 Spruce St, Boulder, CO 80302',
      latitude: 40.0195,
      longitude: -105.2791,
      phone_number: '(303) 441-3426',
      website: 'https://bouldercolorado.gov/locations/spruce-pool',
      schedule_url: null,
      lane_count: 6,
      hours: [
        { day_of_week: 'Monday',    open_time: '7:00 AM', close_time: '7:00 PM' },
        { day_of_week: 'Tuesday',   open_time: '7:00 AM', close_time: '7:00 PM' },
        { day_of_week: 'Wednesday', open_time: '7:00 AM', close_time: '7:00 PM' },
        { day_of_week: 'Thursday',  open_time: '7:00 AM', close_time: '7:00 PM' },
        { day_of_week: 'Friday',    open_time: '7:00 AM', close_time: '7:00 PM' },
        { day_of_week: 'Saturday',  open_time: '8:00 AM', close_time: '6:00 PM' },
        { day_of_week: 'Sunday',    open_time: '8:00 AM', close_time: '6:00 PM' },
      ],
    },
  ];

  for (const pool of pools) {
    const { hours, ...poolData } = pool;

    // Upsert the pool
    await prisma.pool.upsert({
      where: { id: poolData.id },
      update: {
        name: poolData.name,
        address: poolData.address,
        latitude: poolData.latitude,
        longitude: poolData.longitude,
        phone_number: poolData.phone_number,
        website: poolData.website,
        schedule_url: poolData.schedule_url,
        lane_count: poolData.lane_count,
      },
      create: {
        ...poolData,
        locality_id: 'boulder',
      },
    });

    console.log(`Upserted pool: ${poolData.id}`);

    // Delete existing lap_swim_hours for this pool to avoid duplicates on re-seed
    await prisma.lapSwimHour.deleteMany({
      where: { pool_id: poolData.id },
    });

    // Re-insert lap_swim_hours
    await prisma.lapSwimHour.createMany({
      data: hours.map((h) => ({
        pool_id: poolData.id,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
      })),
    });

    console.log(`  Seeded ${hours.length} lap swim hours for pool: ${poolData.id}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
