import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const colleges = await prisma.college.findMany();
  if (colleges.length === 0) {
    console.error("No colleges found. Run seed first.");
    return;
  }
  const collegeId = colleges[0].id;

  await prisma.property.create({
    data: {
      title: "Verified fully loaded PG",
      slug: "verified-fully-loaded-pg",
      description: "Great PG",
      location: "Rajarampuri",
      landmark: "Near XYZ",
      genderPreference: "Female",
      occupancyType: "Single",
      foodType: "Veg & Non-Veg",
      price: 5000,
      deposit: 5000,
      vacantBeds: 2,
      ownerName: "Test Owner",
      ownerPhone: "9999999999",
      collegeId: collegeId,
      verifiedAt: new Date(),
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267" },
          { url: "https://images.unsplash.com/photo-1502672260266-1c1de2d9d0cb" }
        ]
      }
    }
  });

  await prisma.property.create({
    data: {
      title: "Zero beds vacant",
      slug: "zero-beds-vacant",
      description: "Full PG",
      location: "Shahupuri",
      landmark: "Near ABC",
      genderPreference: "Male",
      occupancyType: "Double",
      foodType: "Veg Only",
      price: 3000,
      deposit: 2000,
      vacantBeds: 0,
      ownerName: "Test Owner 2",
      ownerPhone: "8888888888",
      collegeId: collegeId,
      verifiedAt: new Date(),
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2" }
        ]
      }
    }
  });

  await prisma.property.create({
    data: {
      title: "This is a very very long title to test how it wraps on a small mobile device with no photos",
      slug: "very-long-title",
      description: "No photo PG",
      location: "Tarabai Park",
      landmark: "Near PQR",
      genderPreference: "Any",
      occupancyType: "Triple",
      foodType: "No mess",
      price: 2000,
      deposit: 1000,
      vacantBeds: 3,
      ownerName: "Test Owner 3",
      ownerPhone: "7777777777",
      collegeId: collegeId,
      verifiedAt: new Date()
    }
  });

  await prisma.property.create({
    data: {
      title: "Closed PG",
      slug: "closed-pg",
      description: "Closed",
      location: "Rajarampuri",
      landmark: "Near LMN",
      genderPreference: "Female",
      occupancyType: "Single",
      foodType: "No mess",
      price: 4000,
      deposit: 4000,
      vacantBeds: 1,
      ownerName: "Test Owner 4",
      ownerPhone: "6666666666",
      collegeId: collegeId,
      closedAt: new Date(),
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267" }
        ]
      }
    }
  });

  console.log("Created 4 fixtures.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
