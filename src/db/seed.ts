import 'dotenv/config';
import { prisma } from './prisma.js';

const categories = [
  ['mobile-phones', 'Mobile phones'],
  ['tablets', 'Tablets'],
  ['computers', 'Computers'],
  ['laptops', 'Laptops'],
  ['game-consoles', 'Game consoles'],
  ['handheld-gaming-devices', 'Handheld gaming devices'],
  ['cameras', 'Cameras'],
  ['music-players', 'MP3/music players'],
  ['e-readers', 'E-readers'],
  ['tvs-displays', 'TVs/displays'],
  ['audio-equipment', 'Audio equipment'],
  ['headphones', 'Headphones'],
  ['smartwatches', 'Smartwatches'],
  ['wearables', 'Wearables'],
  ['networking-equipment', 'Networking equipment'],
  ['smart-home-devices', 'Smart-home devices'],
  ['vr-ar-devices', 'VR/AR devices'],
  ['drones', 'Drones'],
  ['printers', 'Printers'],
  ['other-electronics', 'Other electronics'],
] as const;

const products = [
  ['Nokia', 'Nokia 3310', 'mobile-phones'],
  ['Nokia', 'Nokia N95', 'mobile-phones'],
  ['Sony Ericsson', 'Sony Ericsson K750i', 'mobile-phones'],
  ['BlackBerry', 'BlackBerry Pearl', 'mobile-phones'],
  ['BlackBerry', 'BlackBerry Bold', 'mobile-phones'],
  ['HTC', 'HTC HD2', 'mobile-phones'],
  ['HTC', 'HTC Dream', 'mobile-phones'],
  ['Apple', 'iPhone', 'mobile-phones'],
  ['Apple', 'iPhone 3GS', 'mobile-phones'],
  ['Apple', 'iPhone 4', 'mobile-phones'],
  ['Apple', 'iPhone 5', 'mobile-phones'],
  ['Samsung', 'Galaxy S', 'mobile-phones'],
  ['Samsung', 'Galaxy S2', 'mobile-phones'],
  ['Google', 'Nexus 5', 'mobile-phones'],
  ['Google', 'Google Pixel', 'mobile-phones'],
  ['Apple', 'iPad', 'tablets'],
  ['Apple', 'iPod Mini', 'music-players'],
  ['Apple', 'iPod Classic', 'music-players'],
  ['Nintendo', 'Game Boy', 'handheld-gaming-devices'],
  ['Nintendo', 'Game Boy Color', 'handheld-gaming-devices'],
  ['Nintendo', 'Nintendo DS', 'handheld-gaming-devices'],
  ['Nintendo', 'Nintendo Switch', 'game-consoles'],
  ['Sony', 'PlayStation 2', 'game-consoles'],
  ['Sony', 'PlayStation 3', 'game-consoles'],
  ['Sony', 'PlayStation 4', 'game-consoles'],
  ['Microsoft', 'Xbox 360', 'game-consoles'],
  ['Valve', 'Steam Deck', 'handheld-gaming-devices'],
  ['Apple', 'MacBook', 'laptops'],
  ['Lenovo', 'ThinkPad', 'laptops'],
  ['Microsoft', 'Surface Pro', 'tablets'],
] as const;

async function seed() {
  for (const [key, label] of categories) {
    await prisma.category.upsert({
      where: { key },
      update: { label },
      create: { key, label },
    });
  }

  for (const [manufacturerName, name, categoryKey] of products) {
    const manufacturer = await prisma.manufacturer.upsert({
      where: { name: manufacturerName },
      update: {},
      create: { name: manufacturerName },
    });

    const category = await prisma.category.findUniqueOrThrow({ where: { key: categoryKey } });

    await prisma.canonicalProduct.upsert({
      where: { manufacturerId_name: { manufacturerId: manufacturer.id, name } },
      update: {},
      create: {
        manufacturerId: manufacturer.id,
        categoryId: category.id,
        name,
        aliases: {
          create: { alias: name.toLowerCase() },
        },
      },
    });
  }

  console.log('Seed complete (development seed data).');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
